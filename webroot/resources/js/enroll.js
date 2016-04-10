
var schedule_container = document.getElementById('schedule-div');
var schedule_title = document.getElementById('schedule-name');
var schedule_panel = document.getElementById('schedule-detail');
var undo_drop_array = [];
var selected_schedule = -1;

$(function() {


    var weekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    //Scheduler config
    var controllerURL = $('#info-controller').data('controllerUrl');
    var main_schedule = null;

    //Get Preferences
    $('#scheduler-pref').collapse({show: true});
    $preference_div = $('#scheduler-pref');

    //Load preferences. This method empties the preference div, and prints all the preferences from the server.
    function load_preference(){
        $.getJSON( controllerURL + '/get-preference',
            function(preferences) {
                //Empty Preference Div
                $preference_div.empty();

                //Print every preference retreived.
                for(var key in preferences){
                    console.log();
                    $preference_div.append('<p data-prefhash='+key+'><span class="glyphicon glyphicon-ban-circle"></span>' +
                        weekDay[preferences[key].weekday] + ' ' +
                        preferences[key].start + ' - ' +
                        preferences[key].end + ' ' +
                        '</p>');
                }

                //If there are no preferences, then print this message.
                if(preferences.length == 0){
                    $preference_div.append('<p data-prefhash="empty">No preferences</p>');
                }
            }
        );
    }




    $(document).ready(function() {
        var checkboxes = $("input[type='checkbox']")
        var starttime = ($('#starttime').val());
        var endtime = ($('#endingtime').val());
        var checked = false;
        $('#btnsubmit').attr('disabled', true);

        checkboxes.click(function() {
                $('#btnsubmit').attr('disabled', false);
                ("disabled", !checkboxes.is(":checked"));
            }
        );

        $("#time_all_day").change(function ()
        {
            if($("#time_all_day").is(':checked')) {
                $('#starttime').attr('disabled', true);
                $('#endingtime').attr('disabled', true);
            }
            else
            {
                $('#starttime').attr('disabled', false);
                $('#endingtime').attr('disabled', false);

            }
        });


        $('#btnsubmit').on('click', function(e) {

            var days = [];
            var addeddays=[];
            var starttime = ($('#starttime').val());
            var endtime = ($('#endingtime').val());



            $("input:checkbox[name=weekday]:checked").each(function()

            {

                if($("#time_all_day").is(':checked')) {
                    console.log($(this).val());
                    days.push({
                        "day": $(this).val(),
                        "starttime": '0:00',
                        "endtime": '24:00'

                    });
                }

                else {
                    days.push({
                        "day": $(this).val(),
                        "starttime": starttime,
                        "endtime": endtime

                    });
                }
            });
            if(endtime < starttime) {
                alert("ENDTIME MUST BE LATER THAN STARTTIME");
                e.preventDefault();
            }

            else {
            console.log(days);
            $('#scheduler-pref').empty();

            for(var i in days) {
                $('#scheduler-pref').append('Day:' + '<div class = "pref"  >' + '<div id ="day">' + days[i].day + '</div>'+ '&nbsp' + "Startime:"+ '<div id ="startingtime">'+ days[i].starttime +'</div>'+  '&nbsp' + "Endtime:"+ '<div id = "endtime">' + days[i].endtime +'</div> ' + '<button type="button" id="button_remove"  +  class="btn btn-danger">remove</button>' + '</div>');

            }

                for( var i in days) {

                    var preference =
                    {
                        start: days[i].starttime,
                        end: days[i].endtime,
                        day:days[i].day


                    }
                    console.log(JSON.stringify(preference));

                    $.ajax({
                        method: 'POST',
                        url: controllerURL + '/add-preference',
                        data: {input: preference},
                        success: function () {
                            console.log("Preferences added");
                            $('#scheduler-pref-modal').modal('hide');

                        }
                    });
                }

    }
        });
            });


    $("#scheduler-pref-modal").on("hidden.bs.modal", function(){
        $(this)
            .find("input,textarea,select").val('')
            .end()
            .find("input[type=checkbox], input[type=radio]").prop("checked", "")
            .end();
    });





    //Removing a preference.
    $(document).on('click','#scheduler-pref > p', function()
    {
        //Getting the hash id of the preference.
        var key = $(this).data('prefhash');
        if(key !== "empty"){
            $.ajax({
                method: 'POST',
                url: controllerURL + '/remove-preference',
                data: {input: key},
                success: function (output) {
                    if(output != '') {
                        console.log("hello");
                        notify(true, output);
                    }
                    else
                        notify(false, "Had a problem removing the preference.");
                    load_preference();
                }
            });
        }

        $("#scheduler-pref").on('click', "#button_remove",function()
            {


                $(this).parent().remove();


            }
        );



    });

    //Search
    var $srch_input = $('#scheduler-search');
    $srch_input.autocomplete({
        source: function(request, response){
            $.getJSON( controllerURL + '/search-list/',
                function(data){
                    response($.ui.autocomplete.filter(data, request.term));
                });
        },
        minLength: 3,
        select: function(event, ui){
            var course = ui.item.hash;
            $.ajax({
                method: 'POST',
                url: controllerURL + '/add-course',
                data: {input: course},
                success: function (output) {
                    if(output != ''){
                        notify(false, output);
                    }
                    else{
                        load_course_.list();

                        //Empty undo
                        undo_drop_array = [];
                        $('.schedule-undo-drop').hide();

                        $generate_div.empty();
                        generated_schedules = [];
                        if(selected_schedule != -1)
                        {
                            main_schedule.render();
                            selected_schedule = -1;
                        }
                    }
                },
                error: function (xhr, status, error) {
                    alert(xhr.responseText);
                }
            });

            $srch_input.val('');
            return false;
        }
    });

    //Auto Pick
    var $auto_pick_btn = $('.auto-pick');
    $auto_pick_btn.click(function () {
        $.ajax({
            method: 'POST',
            url: controllerURL + '/auto-pick',
            data: {input: null},
            success: function (output) {
                if(output == ''){
                    notify(true, 'Successfully added random course.');
                    load_course_list();
                }
                else
                    notify(false, output);
            },
            error: function (xhr, status, error) {
                alert(xhr.responseText);
            }
        });
    });

    //Schedule Generation
    var $generate_btn = $('.generate');
    var $generate_div = $('.generated-schedules');

    var generated_schedules = [];
    $generate_btn.click(function () {
        $.getJSON(
            controllerURL + '/generate',
            function (output) {
                generated_schedules = [];
                $generate_div.empty();

                if(output.length == 0)
                    notify(false, 'Generator found 0 results! Try adding one course at a time.')
                else
                    notify(true, "Generator found " + output.length + " results!");

                for (var i in output) {
                    var name = 'Schedule #' + (parseInt(i) + 1);
                    $generate_div.append('' +
                        '<div class="list-group-item scheduler-list-item schedule" data-schedule-index="'
                        + i + '">'
                        + name + '</div>');

                    generated_schedules.push(
                    new Schedule(schedule_container, schedule_title, schedule_panel,name, output[i][0], output[i][1], true)
                );
            }
            }
        );
    });

    $(document).on('click', '.schedule', function () {
        $('.green').removeClass('green');
        $(this).addClass('green');
        if($(this).hasClass('main-schedule')) {
            selected_schedule = -1;
            main_schedule.render();
        }
        else {
            var index = $(this).data('scheduleIndex');
            selected_schedule = index;
            generated_schedules[index].render();
        }
    });

    $(document).on("keydown", function (e) {
        var key = e.which;
        if (key == 39) { //Right Key
            if (selected_schedule < generated_schedules.length - 1) {
                selected_schedule++;
                $('.green').removeClass('green');
                $('.generated-schedules .schedule:nth-child(' + (selected_schedule + 1) + ')').addClass('green');
                generated_schedules[selected_schedule].render();
            }
        } else if (key == 37) {//Left Key
            if (selected_schedule > -1) {
                selected_schedule--;
                if(selected_schedule == -1) {
                    $('.green').removeClass('green');
                    $('.main-schedule').addClass('green');
                    main_schedule.render();
                }
                else {
                    $('.green').removeClass('green');
                    $('.generated-schedules .schedule:nth-child(' + (selected_schedule + 1) + ')').addClass('green');
                    generated_schedules[selected_schedule].render();
                }
            }
        }
    });

    //Commit Schedule //TODO: Confirmation dialogue box
    var $commit_btn = $('.scheduler-commit');
    $commit_btn.click(function () {
        if(selected_schedule != -1){
            var new_schedule = generated_schedules[selected_schedule].object;
            $.ajax({
                method: 'POST',
                url: controllerURL + '/commit',
                data: {input: new_schedule},
                success: function (output) {
                    if(output == ''){
                        notify(false, 'Failed at committing new schedule.');
                    }
                    else{
                        load();

                        $generate_div.empty();
                        generated_schedules = [];

                        undo_drop_array = [];
                        $undo_btn.hide();

                        notify(true, 'Successfully enrolled new section(s).');
                    }
                },
                error: function (xhr, status, error) {
                    alert(xhr.responseText);
                }
            });
        }
    });

    //Remove Section
    $(document).on('click', '.drop-section', function(){
        var response = confirm('Are you sure you want to do this? You are fully responsible if sections renders full and will not re-register!');
        if(response){
            var hash = $(this).data('hashId');
            $.ajax({
                method: 'POST',
                url: controllerURL + '/drop',
                data: {input: hash},
                success: function (output) {
                    if(output == ''){
                        notify(false, 'Failed at dropping section.');
                    }
                    else{
                        load();

                        $generate_div.empty();
                        generated_schedules = [];

                        notify(true, 'Successfully dropped a section.');
                        undo_drop_array.push(output);
                    }
                    $undo_btn.show();
                },
                error: function (xhr, status, error) {
                    alert(xhr.responseText);
                }
            });
        }
    });

    var $undo_btn = $('.schedule-undo-drop');
    $undo_btn.click(function(){
        if(undo_drop_array.length != 0){
            var section = undo_drop_array.pop();
            $.ajax({
                method: 'POST',
                url: controllerURL + '/undo-drop',
                data: {input: section},
                success: function (output) {
                    if(output != ''){
                        if(undo_drop_array.length == 0)
                            $undo_btn.hide();
                        notify(true, 'Successfully undo drop section.');

                        generated_schedules = [];
                        $generate_div.empty();

                        load();
                    }
                },
                error: function (xhr, status, error) {
                    undo_drop_array.push(section);
                    alert(xhr.responseText);
                }
            });
        }
    });

    $('.schedule-reset').click(function(){
        $.ajax({
            method: 'POST',
            url: controllerURL + '/reset',
            success: function(){
                location.reload();
            }
        });
    });

    $(document).on('click','.generated-course-item',function(){
        var course_id = $(this).data("courseId");
        $.ajax({
            method: 'POST',
            url: controllerURL + '/remove-course',
            data: {input: course_id},
            success: function(output){
                if(output == ''){
                    notify(false, 'Failed to remove course. Reset Scheduler.')
                }
                else{
                    load_course_list();
                    notify(true, output);
                }
            }
        });
    });

    function load(){
        load_main_schedule();
        load_course_list();
        load_preference();
    }

    var $reg_div = $('#scheduler-reg-course');
    function load_course_list(){
        $.getJSON(controllerURL + '/course-list',
            function(course){
                $reg_div.empty();
                for(var key in course['registered']){
                    $reg_div.append('<div class="list-group-item scheduler-list-item">'+course['registered'][key]+'</div>');
                }
                for(var key in course['unregistered']){
                    $reg_div.append('<div class="list-group-item list-group-item-warning scheduler-list-item generated-course-item" data-course-id="'+key+'">'+course['unregistered'][key]['name']+'<span class="badge">'+course['unregistered'][key]['count']+'</span></div>');
                }
                if(course['registered'].length == 0 && course['unregistered'].length == 0){
                    $reg_div.append('<div class="list-group-item scheduler-list-item">No Courses.</div>');
                }
            }
        );
    }
    /**
     * Loads the main schedule on to the user interface.
     */
    function load_main_schedule(){
        $.getJSON( controllerURL + '/load',
            function (schedule) {
                main_schedule = new Schedule(schedule_container, schedule_title, schedule_panel, 'CURRENT SCHEDULE', schedule, null, false);
                main_schedule.render();
                selected_schedule = -1;
            }
        );
    }

    load();

});

function notify(success, innerHTML){
    var notify = $('#scheduler-notify-item');
    notify.text(innerHTML);
    if(success)
        notify.css('background-color', ' #2ecc71');
    else
        notify.css('background-color', ' #f1c40f');
    notify.stop().fadeIn(200).delay(3200).fadeOut(800);
}
