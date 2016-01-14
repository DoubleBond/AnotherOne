<?php 
defined('BASEPATH') OR exit('No direct script access allowed'); 
/**
* Controls Login Process
*/
class Login extends CI_Controller
{
	
	function __construct()
	{
		parent::__construct();
	}

	function index()
	{
		if($this->session->userdata('user_id'))
		{
			redirect(base_url());
		}

		$data['title'] = 'Login';
		$data['info_bar'] = '</i>Welcome to mytinerary. A simple web app for schedule making and course sequence planning.';

		$this->load->view('layouts/header.php', $data);

		if($this->input->post('signin_btn'))
		{
			$this->load->model('user');

			$login_id = $this->input->post('login_id');
			$password = $this->input->post('password');
			
			$this->form_validation->set_rules('login_id', 'Login ID', 'trim|required');
			$this->form_validation->set_rules('password', 'Password', 'trim|required');


			if($this->form_validation->run() === FALSE)
			{
				goto view;
			}

			$result = $this->user->authenticate($login_id, $password);

			if($result === FALSE)
			{
				$data['invalid_record'] = 'Did not match any records. Try again';
				goto view;
			}

			$this->session->set_userdata('user_id', $result->id);
			$this->session->set_userdata('is_admin', $result->admin);

			redirect(base_url());
			return;
		}

		view:
		
		$this->load->view('login/index.php', $data);
		$this->load->view('layouts/footer.php');
	}

	function signout()
	{
		session_destroy();
		redirect(base_url().'login', 'refresh');
	}
}
?>