<?php

	require_once 'JAMA/Matrix.php';

	/**
	 *
	 */
	class FuzzyClustering
	{
		private $m_Fuzzyness;
		private $m_Epsilon;
		
		private $m_NumClusters;
		private $m_NumPoints;
		private $m_PointSize;
		
		private $m_CentroidMatrix;
		private $m_MembershipMatrix;
		private $m_NewMembershipMatrix;
		private $m_Dataset;
		
		private $m_Log;
		
		private function Log($msg)
		{
			$this->m_Log .= $msg . "\n";
		}
		
		public function GetLog()
		{
			return $this->m_Log;
		}
	
		public function __construct($matrix, $numClusters, $fuzzyness = 1.1, $epsilon = 0.01) 
		{
			$this->m_Fuzzyness   		 = $fuzzyness;
			$this->m_Epsilon     		 = $epsilon;
			$this->m_NumClusters 		 = $numClusters;
			$this->m_NumPoints   		 = $matrix->m;
			$this->m_PointSize           = $matrix->n;
			$this->m_CentroidMatrix      = new Matrix($this->m_PointSize);
			$this->m_MembershipMatrix    = new Matrix($this->m_NumClusters);
			$this->m_NewMembershipMatrix = new Matrix($this->m_NumClusters);
			$this->m_Dataset 			 = $matrix;
		
			for ($i = 0 ; $i < $this->m_NumPoint ; ++$i) {
				$normFactor = 0.0;
				
				for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
					$this->m_MembershipMatrix->set($j, $i, rand(0, 1));
					$normFactor += $this->m_MembershipMatrix->get($j, $i);
				}
				for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
					$this->m_MembershipMatrix->set($j, $i, $this->m_MembershipMatrix->get($j, $i) / normFactor);
				}
			}
			
			$this->Log('Fuzzy membership (C' . $this->m_NumClusters . ' X P' . $this->m_NumPoint . ')');
			
			$this->ComputeCentroids();
		}
		
		public function ComputeCentroids() 
		{
			$m = $this->m_MembershipMatrix->times($this->m_Dataset);
			
			$uk = new Matrix(1, $this->m_NumClusters);
			for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
				for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
					$uk->set(1, $j, $uk->get(1, $j) + $this->m_MembershipMatrix->get($j, $i));
				}
			}
			for ($j = 0 ; $j < $this->m_NumCluster ; ++$j) {
				for ($f = 0 ; $f < $this->m_PointSize ; ++$f) {
					$this->m_CentroidMatrix->set($j, $f, $this->m_CentroidMatrix->get($j, $f) / $uk->get(1, $j));
				}
			}
			
			$this->Log('Centroids (C' . $this->m_NumClusters . 'X P' . $this->m_PointSize . ')');
		}
		
		public function ComputeCentroidsAlt()
		{
			$uijm = new Matrix($this->m_NumClusters, $this->m_NumPoints);
			$norm = 0.0;
		
			for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
				for ($f = 0 ; $f < $this->m_PointSize ; ++$f) {
					$this->m_CentroidMatrix->set($j, $f, 0.0);
				}
			}
			
			for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
				for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
					$ujim->set($j, $i, pow($this->m_MembershipMatrix->get($j, $i), $this->m_Fuzzyness));
				}
			}
			
			for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
				for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
					for ($f = 0 ; $f < $this->m_PointSize ; ++$f) {
						$this->m_CentroidMatrix->set($j, $f, $this->m_CentroidMatrix->get($j, $f) + $ujim->get($j, $i) * $this->m_Dataset->get($i, $f));
					}
				}
			}
			
			for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
				$norm = 0.0;
				
				for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
					$norm += $ujim->get($j, $i);
				}
				for ($f = 0 ; $f < $this->m_PointSize ; ++$f) {
					$this->m_CentroidMatrix->set($j, $f, $this->m_CentroidMatrix->get($j, $f) / norm);
				}
			}
			
			$this->Log('Norm: ' . $norm);
			$this->Log('Centroids (C' . $this->m_NumClusters . ' X P' . $this->m_PointSize . ')');
		}
		
		public function UpdateMembership()
		{
			$normMatrixOneXIMinCJ = new Matrix($this->m_NumPoints, $this->m_NumClusters);
			
			for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
				for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
					$normMatrixOneXIMinCJ->set($i, $j, 0.0);
				}
			}
			
			for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
				for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
					for ($f = 0 ; $f < $this->m_PointSize ; ++$f) {
						$normMatrixOneXIMinCJ->set($i, $j, $normMatrixOneXIMinCJ->get($i, $j) + abs($this->m_Dataset->get($i, $f) - $this->m_CentroidMatrix->get($j, $f)));
					}
					
					for ($i = 0 ; $i < $this->m_NumPoints ; ++$i) {
						for ($j = 0 ; $j < $this->m_NumClusters ; ++$j) {
							$coeff = 0.0;
							for ($k = 0 ; $k < $this->m_NumClusters ; ++$k) {
								$coeff += pow(($normMatrixOneXIMinCJ->get($i, $j) / $normMatrixOneXIMinCJ->get($i, $k)), 2 / ($this->m_Fuzzyness - 1));
							}
							
							$this->m_NewMembershipMatrix->set($j, $i, 1 / $coeff);
						}
						
						$this->Log('New membership');
						$this->Log($this->m_NewMembershipMatrix->getHTML());
						
						if (!$this->CanStop()) {
							$this->m_MembershipMatrix = $this->m_NewMembershipMatrix;
							return false;
						}
						
						return true;
					}
				}
			}
		}
		
		public function CanStop()
		{
			$m = $this->m_MembershipMatrix->minus($this->m_NewMembershipMatrix);
			$t = $m->norm1();
			$this->Log('Norm t = ' . $t);
			return $t < $this->m_Epsilon;
		}
		
		public function Cluster($iterations = 100)
		{
			$this->m_Log = '';
			$this->Log('Starting cluster analysis...');
		
			$i = 0;
			while (!$this->UpdateMembership() && ($i++ < $iterations)) {
				$this->ComputeCentroidsAlt();
			}
		}
	}