import { supabase } from "../supabaseClient";

interface Answer {
  question_index: number;
  right_answer_index: number;
}

export class AnswerRepository {
  async createAnswers(
    processId: string,
    areaId: string,
    answers: Answer[]
  ): Promise<any> {
    const dataToInsert = answers.map((answer) => ({
      process_id: processId,
      area_id: areaId,
      question_index: answer.question_index,
      right_answer_index: answer.right_answer_index,
    }));

    const { data, error } = await supabase
      .from("AnswerKey")
      .insert(dataToInsert)
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(error.message);
    }
    return data;
  }

  async updateAnswers(
    processId: string,
    areaId: string,
    answers: Answer[]
  ): Promise<any> {
    // First, delete existing answers for the given processId and areaId
    const { error: deleteError } = await supabase
      .from("AnswerKey")
      .delete()
      .eq("process_id", processId)
      .eq("area_id", areaId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    // Then, insert the new answers
    return this.createAnswers(processId, areaId, answers);
  }

  async deleteAnswers(processId: string, areaId: string): Promise<any> {
    const { error } = await supabase
      .from("AnswerKey")
      .delete()
      .eq("process_id", processId)
      .eq("area_id", areaId);

    if (error) {
      throw new Error(error.message);
    }
    return { message: "Answers deleted successfully" };
  }

  async getAnswers(processId: string, areaId: string): Promise<any> {
    const { data, error } = await supabase
      .from("AnswerKey")
      .select("question_index, right_answer_index")
      .eq("process_id", processId)
      .eq("area_id", areaId);

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
