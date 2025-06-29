-- Functions for ScoreHive Database

-- Function to get answer keys for a specific process and area
CREATE OR REPLACE FUNCTION get_answer_keys(p_process_id UUID, p_area_id UUID)
RETURNS TABLE(question_index INT, right_answer_index INT)
AS $$
BEGIN
    RETURN QUERY
    SELECT ak.question_index, ak.right_answer_index
    FROM AnswerKey ak
    WHERE ak.process_id = p_process_id AND ak.area_id = p_area_id;
END;
$$ LANGUAGE plpgsql;

-- Function to save a single exam result
CREATE OR REPLACE FUNCTION save_exam_result(
    p_id_exam UUID,
    p_process_id UUID,
    p_area_id UUID,
    p_correct_answers INT,
    p_wrong_answers INT,
    p_unscored_answers INT,
    p_score DOUBLE PRECISION
)
RETURNS VOID
AS $$
BEGIN
    INSERT INTO ExamResult (id_exam, process_id, area_id, correct_answers, wrong_answers, unscored_answers, score)
    VALUES (p_id_exam, p_process_id, p_area_id, p_correct_answers, p_wrong_answers, p_unscored_answers, p_score)
    ON CONFLICT (id_exam) DO UPDATE SET
        process_id = EXCLUDED.process_id,
        area_id = EXCLUDED.area_id,
        correct_answers = EXCLUDED.correct_answers,
        wrong_answers = EXCLUDED.wrong_answers,
        unscored_answers = EXCLUDED.unscored_answers,
        score = EXCLUDED.score;
END;
$$ LANGUAGE plpgsql;

-- Function to get exam results for a specific process
CREATE OR REPLACE FUNCTION get_exam_results(p_process_id UUID)
RETURNS TABLE(
    id_exam UUID,
    process_id UUID,
    area_id UUID,
    correct_answers INT,
    wrong_answers INT,
    unscored_answers INT,
    score DOUBLE PRECISION
)
AS $$
BEGIN
    RETURN QUERY
    SELECT er.id_exam, er.process_id, er.area_id, er.correct_answers, er.wrong_answers, er.unscored_answers, er.score
    FROM ExamResult er
    WHERE er.process_id = p_process_id;
END;
$$ LANGUAGE plpgsql;
