CREATE TABLE IF NOT EXISTS Process (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL
);

CREATE TABLE IF NOT EXISTS Area (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS ExamResult (
    id_exam UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL,
    area_id UUID NOT NULL,
    correct_answers INT NOT NULL,
    wrong_answers INT NOT NULL,
    unscored_answers INT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    FOREIGN KEY (process_id) REFERENCES Process(id),
    FOREIGN KEY (area_id) REFERENCES Area(id)
);

CREATE TABLE IF NOT EXISTS AnswerKey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL,
    area_id UUID NOT NULL,
    question_index INT NOT NULL,
    right_answer_index INT NOT NULL,
    FOREIGN KEY (process_id) REFERENCES Process(id),
    FOREIGN KEY (area_id) REFERENCES Area(id)
);
