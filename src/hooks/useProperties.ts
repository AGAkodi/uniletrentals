import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Property, SearchFilters } from '@/types/database';

const fetcher = async (key: string, filters?: SearchFilters) => {
  let query = supabase
    .from('properties')
    .select(`
      *,
      agent:profiles!properties_agent_id_fkey(*)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (filters?.location) {
    query = query.or(`city.ilike.%${filters.location}%,address.ilike.%${filters.location}%,state.ilike.%${filters.location}%`);
  }

  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }

  if (filters?.bedrooms) {
    query = query.gte('bedrooms', filters.bedrooms);
  }

  if (filters?.bathrooms) {
    query = query.gte('bathrooms', filters.bathrooms);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Property[];
};

export function useProperties(filters?: SearchFilters) {
  const key = filters ? `properties-${JSON.stringify(filters)}` : 'properties';
  
  return useSWR<Property[]>(
    key,
    () => fetcher(key, filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );
}

export function useProperty(id: string) {
  return useSWR<Property | null>(
    id ? `property-${id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          agent:profiles!properties_agent_id_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Property | null;
    },
    {
      revalidateOnFocus: false,
    }
  );
}

export function useFeaturedProperties() {
  return useSWR<Property[]>(
    'featured-properties',
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          agent:profiles!properties_agent_id_fkey(*)
        `)
        .eq('status', 'approved')
        .order('views_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Property[];
    },
    {
      revalidateOnFocus: false,
    }
  );
}

export function useAgentProperties(agentId: string | undefined) {
  return useSWR<Property[]>(
    agentId ? `agent-properties-${agentId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
    {
      revalidateOnFocus: false,
    }
  );
}
