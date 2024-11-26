-- Create copilot_metrics table
CREATE TABLE IF NOT EXISTS copilot_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    total_active_users INT NOT NULL,
    total_engaged_users INT NOT NULL,
    scope_type ENUM('organization', 'enterprise') NOT NULL,
    scope_name VARCHAR(60) NOT NULL,
    team VARCHAR(39) NOT NULL DEFAULT '',
    refresh_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_metrics (date, scope_type, scope_name, team)
);

-- Create copilot_ide_code_completions table
CREATE TABLE IF NOT EXISTS copilot_ide_code_completions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id)
);

-- Create copilot_ide_code_completions_languages table
CREATE TABLE IF NOT EXISTS copilot_ide_code_completions_languages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    completion_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (completion_id) REFERENCES copilot_ide_code_completions(id)
);

-- Create copilot_ide_code_completions_editors table
CREATE TABLE IF NOT EXISTS copilot_ide_code_completions_editors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    completion_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (completion_id) REFERENCES copilot_ide_code_completions(id)
);

-- Create copilot_ide_code_completions_editor_models table
CREATE TABLE IF NOT EXISTS copilot_ide_code_completions_editor_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    editor_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_custom_model BOOLEAN NOT NULL,
    custom_model_training_date DATE NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (editor_id) REFERENCES copilot_ide_code_completions_editors(id)
);

-- Create copilot_ide_code_completions_editor_model_languages table
CREATE TABLE IF NOT EXISTS copilot_ide_code_completions_editor_model_languages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    model_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_engaged_users INT NOT NULL,
    total_code_suggestions INT NOT NULL,
    total_code_acceptances INT NOT NULL,
    total_code_lines_suggested INT NOT NULL,
    total_code_lines_accepted INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (model_id) REFERENCES copilot_ide_code_completions_editor_models(id)
);

-- Create copilot_ide_chat table
CREATE TABLE IF NOT EXISTS copilot_ide_chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id)
);

-- Create copilot_ide_chat_editors table
CREATE TABLE IF NOT EXISTS copilot_ide_chat_editors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    ide_chat_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (ide_chat_id) REFERENCES copilot_ide_chat(id)
);

-- Create copilot_ide_chat_editor_models table
CREATE TABLE IF NOT EXISTS copilot_ide_chat_editor_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    editor_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_custom_model BOOLEAN NOT NULL,
    custom_model_training_date DATE NULL,
    total_engaged_users INT NOT NULL,
    total_chats INT NOT NULL,
    total_chat_insertion_events INT NOT NULL,
    total_chat_copy_events INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (editor_id) REFERENCES copilot_ide_chat_editors(id)
);

-- Create copilot_dotcom_chat table
CREATE TABLE IF NOT EXISTS copilot_dotcom_chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id)
);

-- Create copilot_dotcom_chat_models table
CREATE TABLE IF NOT EXISTS copilot_dotcom_chat_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    dotcom_chat_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_custom_model BOOLEAN NOT NULL,
    custom_model_training_date DATE NULL,
    total_engaged_users INT NOT NULL,
    total_chats INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (dotcom_chat_id) REFERENCES copilot_dotcom_chat(id)
);

-- Create copilot_dotcom_pull_requests table
CREATE TABLE IF NOT EXISTS copilot_dotcom_pull_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id)
);

-- Create copilot_dotcom_pull_requests_repositories table
CREATE TABLE IF NOT EXISTS copilot_dotcom_pull_requests_repositories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    pull_requests_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (pull_requests_id) REFERENCES copilot_dotcom_pull_requests(id)
);

-- Create copilot_dotcom_pull_requests_repository_models table
CREATE TABLE IF NOT EXISTS copilot_dotcom_pull_requests_repository_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metrics_id INT NOT NULL,
    repository_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_custom_model BOOLEAN NOT NULL,
    custom_model_training_date DATE NULL,
    total_pr_summaries_created INT NOT NULL,
    total_engaged_users INT NOT NULL,
    FOREIGN KEY (metrics_id) REFERENCES copilot_metrics(id),
    FOREIGN KEY (repository_id) REFERENCES copilot_dotcom_pull_requests_repositories(id)
);