-- 164_add_mock_exam_enabled_to_projects.sql
-- Adds the feature flag for the Barber Student Mock Exam module.

ALTER TABLE projects ADD COLUMN mock_exam_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN projects.mock_exam_enabled IS 'Toggle for provisioning the Barber Student Mock Exam diagnostic layer.';
