import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { TablesInsert } from '@/integrations/supabase/types'
import { toast } from '@/hooks/use-toast'

export function usePosicionesActuales(vehicleTipo?: 'tractor' | 'camion' | 'vehiculo') {
  return useQuery({
    queryKey: ['gps_posiciones_actuales', vehicleTipo],
    queryFn: async () => {
      let q = supabase
        .from('vehicle_positions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000)
      
      if (vehicleTipo) q = q.eq('vehicle_type', vehicleTipo)
      
      const { data, error } = await q
      if (error) throw error
      
      // Nos quedamos solo con la última posición por vehículo
      const latest = new Map<string, typeof data[0]>()
      for (const pos of data) {
        if (!latest.has(pos.vehicle_id)) {
          latest.set(pos.vehicle_id, pos)
        }
      }
      return Array.from(latest.values())
    },
    refetchInterval: 30000 // Actualizar automáticamente cada 30 segundos
  })
}

export function useRecorridoDia(vehicleId: string | null, fecha: string | null) {
  return useQuery({
    queryKey: ['gps_recorrido', vehicleId, fecha],
    queryFn: async () => {
      if (!vehicleId || !fecha) return []
      const start = `${fecha}T00:00:00`
      const end = `${fecha}T23:59:59`
      
      const { data, error } = await supabase
        .from('vehicle_positions')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .gte('timestamp', start)
        .lte('timestamp', end)
        .order('timestamp', { ascending: true })
        
      if (error) throw error
      return data ?? []
    },
    enabled: !!vehicleId && !!fecha,
    refetchInterval: (query) => {
      // Solo auto-refetch si estamos viendo el día de hoy
      const isToday = fecha === new Date().toISOString().slice(0, 10);
      return isToday ? 30000 : false;
    }
  })
}

export function useAddPosicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: TablesInsert<'vehicle_positions'>) => {
      const { data, error } = await supabase.from('vehicle_positions').insert(record).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['gps_posiciones_actuales'] })
      qc.invalidateQueries({ queryKey: ['gps_recorrido'] })
      toast({ title: 'Posición registrada', description: `Vehículo ${vars.vehicle_id?.slice(0, 8) ?? ''}…` })
    },
    onError: (err: Error) => {
      toast({ title: 'Error GPS', description: err.message, variant: 'destructive' })
    }
  })
}