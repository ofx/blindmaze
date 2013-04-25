<?php

	error_reporting(E_ALL & ~E_STRICT);
	ini_set("display_errors", "1");
    ini_set("display_startup_errors", "1");
    ini_set("html_errors", "1");
    ini_set("docref_root", "http://www.php.net/");
    ini_set("error_prepend_string", "<div style='color:red; font-family:verdana; border:1px solid red; padding:5px;'>");
    ini_set("error_append_string", "</div>");

	require_once 'FuzzyClustering.php';

	class AjaxHandler
	{
		private $m_IsAjax;
		
		private $m_Data;
		private $m_Dataset;
	
		public function __construct() 
		{
			$this->m_IsAjax = true;
			$this->m_IsAjax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
		}
		
		protected function ReadDataset()
		{
			$this->m_Data = array();
		
			if (($handle = @fopen('data/matrix.csv', 'r')) !== false) {
				while (($data = fgetcsv($handle, 1000, ',')) !== false) {
					$this->m_Data[] = $data;
				}
				
				fclose($handle);
			} else {
				$this->SaveDataset();
			}
		}
		
		protected function SaveDataset()
		{
			$handle = fopen('data/matrix.csv', 'w');
			
			foreach ($this->m_Data as $rows) {
				fputcsv($handle, $rows);
			}
			
			fclose($handle);
		}
		
		protected function ReadClusterDataset()
		{
			$clusterData = array();
		
			if (($handle = @fopen('data/clusters.txt', 'r')) !== false) {
				$temp = array();
				while (($data = fgetcsv($handle, 1000, ',')) !== false) {
					if ($data[0] != null) {
						$temp[] = $data;
					}
				}
				
				$c = count($temp);
				for ($i = 0 ; $i < $c ; $i += 2) {
					$clusterData[$temp[$i][0]] = $temp[$i + 1];
				}
				
				fclose($handle);
			}
			
			return $clusterData;
		}
		
		protected function SubmitSession()
		{
			$session = isset($_GET['session']) ? $_GET['session'] : $_POST['session'];
			
			if ($session) {
				$session = json_decode($session);
				
				$this->m_Data[] = $session;
				
				$this->SaveDataset();
				
				$this->OutputAndExit(array('success' => true));
			}
		}
		
		protected function FetchClusterData()
		{
			$this->ReadDataset();
		
			$clusterData = $this->ReadClusterDataset();
			
			$elms = array();
			
			// Process
			foreach ($clusterData as $clusterIndex => $elements) {
				foreach ($elements as $element) {
					$elms[$element]['clusterindex'][] = $clusterIndex;
					$c = count($this->m_Data[$element]);
					for ($i = 0 ; $i < $c ; ++$i) {
						$elms[$element]['i' . $i] = $this->m_Data[$element][$i];
					}
				}
			}
			
			$this->OutputAndExit($elms);
		}
		
		protected function Dispatch()
		{
			$method = isset($_GET['method']) ? $_GET['method'] : $_POST['method'];
			
			switch ($method) {
				case 'submitsession':
					$this->SubmitSession();
					break;
				case 'fetchclusterdata':
					$this->FetchClusterData();
					break;
			}
		}
		
		public function Handle()
		{
			if (true || $this->m_IsAjax) {
				$this->ReadDataset();
				$this->Dispatch();
			} else {
				$this->OutputAndExit(array('success' => false, 'msg' => 'Not a valid AJAX request'));
			}
		}
		
		protected function OutputAndExit($data)
		{
			echo json_encode($data);
			exit;
		}
	
		public static function Main()
		{
			$ajaxHandler = new AjaxHandler();
			$ajaxHandler->Handle();
		}
	}
	
	AjaxHandler::Main();