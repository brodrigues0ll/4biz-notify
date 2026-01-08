'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function SyncResultsDialog({ open, onOpenChange, stats }) {
  if (!stats) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronização Concluída</DialogTitle>
          <DialogDescription>
            Seus chamados foram atualizados com sucesso
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Novos</p>
            <p className="text-2xl font-bold">{stats.new}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Alterados</p>
            <p className="text-2xl font-bold">{stats.updated}</p>
          </div>
          {stats.removed > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Removidos</p>
              <p className="text-2xl font-bold">{stats.removed}</p>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
