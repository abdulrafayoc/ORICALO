import mlflow
import os
from typing import Dict, Any, Optional
from datetime import datetime

class MLflowLogger:
    """
    Standardized logger for ORICALO experiments using MLflow.
    Handles experiment setup, run management, and metric logging.
    """
    
    def __init__(self, experiment_name: str = "ORICALO_ASR_Experiments"):
        """
        Initialize the MLflow logger.
        
        Args:
            experiment_name: Name of the experiment bucket in MLflow.
        """
        self.experiment_name = experiment_name
        mlflow.set_experiment(experiment_name)
        
    def start_run(self, run_name: Optional[str] = None, tags: Optional[Dict[str, str]] = None):
        """
        Start a new MLflow run.
        
        Args:
            run_name: Human-readable name for this run (e.g., "whisper-small-finetune-v1").
            tags: Dictionary of tags to attach to the run.
        """
        if not run_name:
            run_name = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
        return mlflow.start_run(run_name=run_name, tags=tags)
        
    def log_params(self, params: Dict[str, Any]):
        """Log hyperparameters or configuration settings."""
        mlflow.log_params(params)
        
    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None):
        """
        Log numerical metrics (WER, Loss, Latency).
        
        Args:
            metrics: Dictionary of metric names and values.
            step: Optional step number (e.g., epoch or batch number).
        """
        mlflow.log_metrics(metrics, step=step)
        
    def log_artifact(self, local_path: str, artifact_path: Optional[str] = None):
        """Log a local file or directory as an artifact."""
        mlflow.log_artifact(local_path, artifact_path)
        
    def end_run(self):
        """End the current active run."""
        mlflow.end_run()

# Global instance for easy import
ml_logger = MLflowLogger()
