"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRates } from "@/hooks/use-config";
import { getColorValue } from "@/lib/color-map";
import { CategoryIcon, ColorPicker, IconPicker, SOURCE_ICONS } from "@/components/ui/icon-picker";
import { MoneyInput, parseMoneyInput } from "@/components/ui/money-input";
import {
  useSources,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  type Source,
} from "@/hooks/use-sources";

const SOURCE_TYPES = ["efectivo", "digital", "banco", "tarjeta"] as const;

export default function FuentesPage() {
  const { data: sources, isLoading } = useSources();
  const { data: ratesData } = useRates();
  const currencyBase = ratesData?.baseCurrency ?? "COP";
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "efectivo" as "efectivo" | "digital" | "banco" | "tarjeta",
    icon: "wallet",
    color: "amber-500",
    initialBalance: 0,
  });

  const openCreateDialog = () => {
    setEditingSource(null);
    setFormData({ name: "", type: "efectivo", icon: "wallet", color: "amber-500", initialBalance: 0 });
    setDialogOpen(true);
  };

  const openEditDialog = (src: Source) => {
    setEditingSource(src);
    setFormData({ name: src.name, type: src.type, icon: src.icon, color: src.color, initialBalance: src.initialBalance });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, initialBalance: formData.initialBalance || undefined };
    if (editingSource) {
      await updateSource.mutateAsync({ ...payload, id: editingSource.id });
    } else {
      await createSource.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este medio de pago? Solo se puede eliminar si no tiene transacciones asociadas.")) {
      await deleteSource.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medios de Pago</h1>
          <p className="text-muted-foreground">Gestiona tus cuentas, billeteras y métodos de pago</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo medio de pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSource ? "Editar medio de pago" : "Nuevo medio de pago"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type })}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icono</Label>
                <IconPicker value={formData.icon} onChange={(icon) => setFormData({ ...formData, icon })} icons={SOURCE_ICONS} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
              </div>
              <div className="space-y-2">
<Label htmlFor="initialBalance">Saldo inicial</Label>
                <MoneyInput
                  id="initialBalance"
                  placeholder="0,00"
                  value={formData.initialBalance.toString()}
                  onChange={(raw) => setFormData({ ...formData, initialBalance: parseMoneyInput(raw) })}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createSource.isPending || updateSource.isPending}>
                  {editingSource ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icono</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando fuentes...
                  </TableCell>
                </TableRow>
              ) : sources?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay medios de pago. Crea el primero.
                  </TableCell>
                </TableRow>
              ) : (
                sources?.map((src) => (
                  <TableRow key={src.id}>
                    <TableCell>
                      <CategoryIcon name={src.icon} color={src.color} />
                    </TableCell>
                    <TableCell className="font-medium">{src.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                        {src.type.charAt(0).toUpperCase() + src.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: getColorValue(src.color) }} />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{formatCurrency(src.initialBalance, currencyBase)}</TableCell>
                    <TableCell>
                      <span className={src.active ? "text-green-600" : "text-red-600"}>
                        {src.active ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(src)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(src.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
