import { supabase } from "../supabaseClient";
import { RequestStatus } from "../types";

export class RequestRepository {
  async createRequest(requestData: Omit<RequestStatus, 'id' | 'created_at' | 'updated_at'>): Promise<RequestStatus> {
    const { data, error } = await supabase
      .from("requeststatus")
      .insert({
        total_exams: requestData.total_exams,
        processed_exams: requestData.processed_exams,
        failed_exams: requestData.failed_exams,
        chunks_total: requestData.chunks_total,
        chunks_completed: requestData.chunks_completed,
        status: requestData.status,
        completed_at: requestData.completed_at,
        error_message: requestData.error_message
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase request insert error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  async getRequestById(id: string): Promise<RequestStatus | null> {
    const { data, error } = await supabase
      .from("requeststatus")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error("Supabase request select error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    if (!data) return null;

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  async updateRequest(id: string, updates: Partial<Omit<RequestStatus, 'id' | 'created_at'>>): Promise<RequestStatus> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Handle status completion
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("requeststatus")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase request update error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  async incrementProcessedExams(id: string, count: number = 1): Promise<RequestStatus> {
    // First get current values
    const current = await this.getRequestById(id);
    if (!current) {
      throw new Error(`Request with id ${id} not found`);
    }

    const newProcessed = current.processed_exams + count;
    const updates: Partial<RequestStatus> = {
      processed_exams: newProcessed
    };

    // Check if request is completed
    if (newProcessed >= current.total_exams) {
      updates.status = 'completed';
    } else if (current.status === 'pending') {
      updates.status = 'processing';
    }

    return this.updateRequest(id, updates);
  }

  async incrementFailedExams(id: string, count: number = 1): Promise<RequestStatus> {
    // First get current values
    const current = await this.getRequestById(id);
    if (!current) {
      throw new Error(`Request with id ${id} not found`);
    }

    const newFailed = current.failed_exams + count;
    const totalProcessed = current.processed_exams + newFailed;
    
    const updates: Partial<RequestStatus> = {
      failed_exams: newFailed
    };

    // Update status based on completion
    if (totalProcessed >= current.total_exams) {
      if (current.processed_exams > 0) {
        updates.status = 'partial'; // Some succeeded, some failed
      } else {
        updates.status = 'failed'; // All failed
      }
    } else if (current.status === 'pending') {
      updates.status = 'processing';
    }

    return this.updateRequest(id, updates);
  }

  async incrementCompletedChunks(id: string): Promise<RequestStatus> {
    // First get current values
    const current = await this.getRequestById(id);
    if (!current) {
      throw new Error(`Request with id ${id} not found`);
    }

    const newCompleted = current.chunks_completed + 1;
    const updates: Partial<RequestStatus> = {
      chunks_completed: newCompleted
    };

    // Update status if all chunks are completed
    if (newCompleted >= current.chunks_total) {
      // Final status depends on exam processing results
      const totalProcessed = current.processed_exams + current.failed_exams;
      if (totalProcessed >= current.total_exams) {
        if (current.failed_exams === 0) {
          updates.status = 'completed';
        } else if (current.processed_exams > 0) {
          updates.status = 'partial';
        } else {
          updates.status = 'failed';
        }
      }
    }

    return this.updateRequest(id, updates);
  }

  async getAllRequests(limit: number = 50): Promise<RequestStatus[]> {
    const { data, error } = await supabase
      .from("requeststatus")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase requests select error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return (data || []).map(item => ({
      ...item,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
      completed_at: item.completed_at ? new Date(item.completed_at) : undefined
    }));
  }
}