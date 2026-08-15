"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileList, MobileCard, MobileActions } from "@/components/layout/mobile-list";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { getColorValue } from "@/lib/color-map";
import { CategoryIcon, ColorPicker, IconPicker, CATEGORY_ICONS } from "@/components/ui/icon-picker";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from "@/hooks/use-categories";

export default function CategoriasPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "gasto" as "gasto" | "ingreso",
    icon: "more-horizontal",
    color: "gray-500",
  });

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", type: "gasto", icon: "more-horizontal", color: "gray-500" });
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formData;
    if (editingCategory) {
      await updateCategory.mutateAsync({ ...payload, id: editingCategory.id });
    } else {
      await createCategory.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar esta categoría? Solo se puede eliminar si no tiene transacciones asociadas.")) {
      await deleteCategory.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">Gestiona tus categorías de gastos e ingresos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "gasto" | "ingreso" })}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icono</Label>
                <IconPicker value={formData.icon} onChange={(icon) => setFormData({ ...formData, icon })} icons={CATEGORY_ICONS} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  {editingCategory ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-0">
          {/* Móvil: cards apiladas */}
          <MobileList>
            {isLoading ? (
              <li className="text-center py-8 text-muted-foreground">Cargando categorías...</li>
            ) : categories?.length === 0 ? (
              <li className="text-center py-8 text-muted-foreground">
                No hay categorías. Crea tu primera categoría.
              </li>
            ) : (
              categories?.map((cat) => (
                <MobileCard key={cat.id}>
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <CategoryIcon name={cat.icon} color={cat.color} />
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium truncate">{cat.name}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cat.type === "gasto" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                          }`}
                        >
                          {cat.type === "gasto" ? "Gasto" : "Ingreso"}
                        </span>
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorValue(cat.color) }} />
                        <span className={cat.active ? "text-green-600 text-xs" : "text-red-600 text-xs"}>
                          {cat.active ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <MobileActions>
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEditDialog(cat)} aria-label="Editar categoría">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => handleDelete(cat.id)} aria-label="Eliminar categoría">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </MobileActions>
                </MobileCard>
              ))
            )}
          </MobileList>

          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icono</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando categorías...
                  </TableCell>
                </TableRow>
              ) : categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay categorías. Crea tu primera categoría.
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <CategoryIcon name={cat.icon} color={cat.color} />
                    </TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.type === "gasto" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {cat.type === "gasto" ? "Gasto" : "Ingreso"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: getColorValue(cat.color) }} />
                    </TableCell>
                    <TableCell>
                      <span className={cat.active ? "text-green-600" : "text-red-600"}>
                        {cat.active ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
