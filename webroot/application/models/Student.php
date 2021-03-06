<?php defined('BASEPATH') OR exit('No direct script access allowed');
include_once 'Helper/Grade.php';

/**
 * Class Student manages all data of the student.
 */
class Student extends CI_Model
{
    private $user_id;

    public function __construct()
    {
        parent::__construct();
        $this->user_id = $this->session->user_id;
    }

    /**
     * Gets the program the student is enrolled in.
     *
     * @return object
     */
    public function getProgram()
    {
        $result = $this->db->query(
            "SELECT
              program.id,
              program.name
            FROM students
              INNER JOIN users
                ON students.user_id = users.id
              INNER JOIN program
                ON students.program_id = program.id
            WHERE users.id = '$this->user_id'");
        return $result->row();
    }

    /**
     * Returns the student id of a user. If user is not a student then it returns null.
     *
     * @return string
     */
    public function getID()
    {
        $result = $this->db->query(
            "SELECT
              students.id
            FROM students
            WHERE students.user_id='$this->user_id' LIMIT 1");
        return $result->row()->id;
    }

    /**
     * Full detail of a student.
     * Returns student id, login name, first name, last name, email, and program name of a student.
     *
     * @return object
     */
    public function getInfo()
    {
        $result = $this->db->query("
            SELECT
              students.id,
              users.login_name,
              users.firstname,
              users.lastname,
              users.email,
              program.name
            FROM students
              INNER JOIN users
                ON students.user_id = users.id
              INNER JOIN program
                ON students.program_id = program.id
            WHERE students.user_id ='$this->user_id' LIMIT 1");
        return $result->row();
    }

    /**
     * Gets the academic record of this student.
     *
     * @return associative array - returns an associative array, where the index is the semester name.
     */
    public function getRecord()
    {
        $result = $this->getRegisteredSemesters();

        if(!$result)
            return FALSE;

        $record = [];

        $this->load->model('course');

        foreach($result as $row){
            $courses = [];
            foreach($this->getRecordBySemester($row->id) as $course){
                array_push($courses, [
                    'detail' => $this->course->getByID($course->course_id),
                    'grade' => $course->grade
                ]);
            }
            $record[$row->name] = $courses;
        }
        return $record;
    }

    /**
     * @return array of semester objects
     */
    public function getRegisteredSemesters()
    {
        return $this->db->query("
            SELECT DISTINCT
              semesters.id,
              semesters.name
            FROM sections
              INNER JOIN semesters
                ON sections.semester_id = semesters.id
              INNER JOIN registered
                ON registered.section_id = sections.id
              INNER JOIN students
                ON registered.student_id = students.id
            WHERE students.user_id = '$this->user_id'
            ORDER BY sections.semester_id DESC")->result();
    }

    /**
     * Gets the registered sections in a particular semesters
     *
     * @param $semester_id - The semester to get
     * @return mixed
     */
    public function getRecordBySemester($semester_id)
    {
        return $this->db->query("
            SELECT
              sections.course_id,
              sections.semester_id,
              registered.id,
              registered.section_id,
              registered.tutorial_id,
              registered.laboratory_id,
              registered.grade
            FROM registered
              INNER JOIN students
                ON registered.student_id = students.id
              INNER JOIN sections
                ON registered.section_id = sections.id
            WHERE sections.semester_id = '$semester_id' AND students.user_id = '$this->user_id'")->result();
    }

    /**
     * Return all grades of the student logged in
     *
     * @return mixed
     */
    public function getStudentsGrades()
    {
        return $this->db->query("
          SELECT
            sections.course_id,
            registered.grade,
            courses.passing_grade
          FROM registered
            INNER JOIN sections
              ON registered.section_id = sections.id
            INNER JOIN students
             ON registered.student_id = students.id
            INNER JOIN courses
              ON sections.course_id = courses.id
          WHERE  students.user_id='$this->user_id'")->result();
    }

    /**
     * Returns array with info of course progress.
     *
     * @return array - Returns an array that contains associative arrays with the program name and another array with
     *      - String => The course full name ex: 'SOEN 341 Software Process'
     *      - Boolean => Is completed course with a passing grade
     *      - Boolean => Can he take the course? (If course is already completed )
     */
    public function getProgress()
    {
        $program = $this->getProgram();

        $course_sequence = $this->db->query("
            SELECT
              courses.id,
              courses.code,
              courses.number,
              courses.name,
              programsequence.semester
            FROM programsequence
              INNER JOIN courses
                ON programsequence.course_id = courses.id
            WHERE programsequence.program_id='$program->id'")->result();

        $course_list = [];
        foreach($course_sequence as $course)
            array_push($course_list, $course->id);
        $course_list = implode(',', $course_list);

        //Getting prerequisites of every course.
        $sql_reqs = $this->db->query("
            SELECT
              courseprequisites.course_id,
              courseprequisites.prerequisite_course_id
            FROM courseprequisites
            WHERE courseprequisites.course_id IN ($course_list)")->result();

        //Grouping the prerequisite into a two dimensional array by course id
        $prerequisites = [];
        if(! empty($sql_reqs))
        {
            $previous_id = $sql_reqs[0]->course_id;
            $prerequisites[$previous_id] = [$sql_reqs[0]->prerequisite_course_id];
            for($i = 1; $i < count($sql_reqs); $i++)
            {
                if($previous_id != $sql_reqs[$i]->course_id)
                    $prerequisites[$sql_reqs[$i]->course_id] = [$sql_reqs[$i]->prerequisite_course_id];
                else{
                    array_push($prerequisites[$sql_reqs[$i]->course_id], $sql_reqs[$i]->prerequisite_course_id);
                }
                $previous_id = $sql_reqs[$i]->course_id;
            }
        }

        //Retrieving all of the student's grades.
        $allGrades = $this->getStudentsGrades();

        //Creating progress list and validating if student has completed the course.
        $progress = [];
        foreach($course_sequence as $value)
        {
            $progress[$value->id] =  [
                'name' => $value->code ." ". $value->number." ".$value->name,
                'completed' => $this->isCompleted($value->id, $allGrades),
                'semester' => $value->semester
            ];
        }

        //Inserting takable attribute to the array
        foreach($progress as $key => $course) {
            $progress[$key]['takable'] = $this->isTakable($prerequisites[$key], $progress);
        }

        return ['program_name' => $program->name, 'progress' => array_values($progress)];
    }

    /**
     * Determines if a course is completed with passing grade or going to be completed.
     *
     * @param $course_id - the course id to compare with.
     * @param $allGrades - the lists of all grades with all courses.
     * @return bool - returns true if he has completed the course.
     * @throws Exception - Throws exception if invalid grade, shouldn't happen however.
     */
    private function isCompleted($course_id,$allGrades)
    {
        foreach($allGrades as $value) {

            if ($value->course_id == $course_id) {

                //
                $grade = new Grade($value->grade);

                if ($grade->passed($value->passing_grade)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Determines if this student can take a course.
     *
     * @param $prereqs - the course id
     * @param $progress - the list of completed courses or not.
     * @return bool - true if student can take the course
     */
    private function isTakable($prereqs, $progress)
    {
        //Check if course prerequisites are completed
        if($prereqs != NULL)
        {
            foreach ($prereqs as $course)
            {
                if (! $progress[$course]['completed'])
                    return false;
            }
        }
        return true;
    }

}