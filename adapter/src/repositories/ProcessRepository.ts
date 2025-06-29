import { supabase } from "../supabaseClient";

interface Process {
  id?: string;
  name: string;
  month: number;
  year: number;
}

export class ProcessRepository {
  async createProcess(process: Omit<Process, 'id'>): Promise<any> {
    const { data, error } = await supabase
      .from("process")
      .insert({
        name: process.name,
        month: process.month,
        year: process.year
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase process insert error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data;
  }

  async getProcesses(): Promise<Process[]> {
    const { data, error } = await supabase
      .from("process")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      console.error("Supabase process select error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data || [];
  }

  async getProcessById(id: string): Promise<Process | null> {
    const { data, error } = await supabase
      .from("process")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error("Supabase process select error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data;
  }

  async updateProcess(id: string, process: Partial<Omit<Process, 'id'>>): Promise<any> {
    const { data, error } = await supabase
      .from("process")
      .update(process)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase process update error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data;
  }

  async deleteProcess(id: string): Promise<any> {
    const { error } = await supabase
      .from("process")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase process delete error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return { message: "Process deleted successfully" };
  }
}