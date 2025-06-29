import { supabase } from "../supabaseClient";

interface Answer {
  question_index: number;
  right_answer_index: number;
}

export class AnswerRepository {
  async testConnection(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("answerkey")
        .select("*")
        .limit(1);
      
      if (error) {
        console.error("Supabase connection test failed:", error);
        throw new Error(`Table access error: ${error.message}`);
      }
      
      console.log("Supabase connection test successful");
      console.log("Sample data structure:", data);
    } catch (err) {
      console.error("Connection test error:", err);
      throw err;
    }
  }

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

    console.log("Attempting to insert:", dataToInsert);
    
    const { data, error } = await supabase
      .from("answerkey")
      .insert(dataToInsert)
      .select();

    console.log("Insert result - data:", data);
    console.log("Insert result - error:", error);

    if (error) {
      console.error("Supabase insert error details:", JSON.stringify(error, null, 2));
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error hint:", error.hint);
      console.error("Error details:", error.details);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
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
      .from("answerkey")
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
      .from("answerkey")
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
      .from("answerkey")
      .select("question_index, right_answer_index")
      .eq("process_id", processId)
      .eq("area_id", areaId);

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
