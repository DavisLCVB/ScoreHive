import { supabase } from "../supabaseClient";

interface Area {
  id?: string;
  name: string;
}

export class AreaRepository {
  async createArea(area: Omit<Area, 'id'>): Promise<any> {
    const { data, error } = await supabase
      .from("area")
      .insert({
        name: area.name
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase area insert error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data;
  }

  async getAreas(): Promise<Area[]> {
    const { data, error } = await supabase
      .from("area")
      .select("*")
      .order("name");

    if (error) {
      console.error("Supabase area select error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data || [];
  }

  async getAreaById(id: string): Promise<Area | null> {
    const { data, error } = await supabase
      .from("area")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error("Supabase area select error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data;
  }

  async updateArea(id: string, area: Partial<Omit<Area, 'id'>>): Promise<any> {
    const { data, error } = await supabase
      .from("area")
      .update(area)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase area update error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return data;
  }

  async deleteArea(id: string): Promise<any> {
    const { error } = await supabase
      .from("area")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase area delete error:", error);
      throw new Error(error.message || `Supabase error: ${JSON.stringify(error)}`);
    }
    
    return { message: "Area deleted successfully" };
  }
}