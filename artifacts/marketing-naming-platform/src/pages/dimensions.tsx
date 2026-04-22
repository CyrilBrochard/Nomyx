import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDimensions,
  useCreateDimension,
  useUpdateDimension,
  useDeleteDimension,
  useDuplicateDimension,
  useCreateDimensionValue,
  useUpdateDimensionValue,
  useDeleteDimensionValue,
  getListDimensionsQueryOptions,
  type DimensionWithValues,
  type DimensionValue,
  type ErrorType,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DimForm {
  name: string;
  code: string;
  order: string;
  enabled: boolean;
}

interface ValForm {
  label: string;
  shortCode: string;
  order: string;
  enabled: boolean;
}

const EMPTY_DIM: DimForm = { name: "", code: "", order: "", enabled: true };
const EMPTY_VAL: ValForm = { label: "", shortCode: "", order: "", enabled: true };

interface DimDialog {
  open: boolean;
  editTarget: DimensionWithValues | null;
}

interface ValDialog {
  open: boolean;
  dimensionId: number | null;
  editTarget: DimensionValue | null;
}

interface DeleteValTarget {
  dimension: DimensionWithValues;
  value: DimensionValue;
}

function toastError(toast: ReturnType<typeof useToast>["toast"], err: ErrorType<unknown>) {
  const data = err.data as Record<string, string> | null;
  const msg = data?.error ?? err.message ?? "Something went wrong";
  toast({ title: "Error", description: msg, variant: "destructive" });
}

export default function Dimensions() {
  const queryClient = useQueryClient();
  const { data: dimensions = [], isLoading } = useListDimensions();
  const { toast } = useToast();

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [dimDialog, setDimDialog] = useState<DimDialog>({ open: false, editTarget: null });
  const [dimForm, setDimForm] = useState<DimForm>(EMPTY_DIM);
  const [deleteDimTarget, setDeleteDimTarget] = useState<DimensionWithValues | null>(null);

  const [valDialog, setValDialog] = useState<ValDialog>({ open: false, dimensionId: null, editTarget: null });
  const [valForm, setValForm] = useState<ValForm>(EMPTY_VAL);
  const [deleteValTarget, setDeleteValTarget] = useState<DeleteValTarget | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListDimensionsQueryOptions().queryKey });
  }

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { mutate: createDimension, isPending: isCreatingDim } = useCreateDimension({
    mutation: {
      onSuccess() { invalidate(); setDimDialog({ open: false, editTarget: null }); toast({ title: "Dimension created" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: updateDimension, isPending: isUpdatingDim } = useUpdateDimension({
    mutation: {
      onSuccess() { invalidate(); setDimDialog({ open: false, editTarget: null }); toast({ title: "Dimension updated" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: deleteDimension } = useDeleteDimension({
    mutation: {
      onSuccess() { invalidate(); setDeleteDimTarget(null); toast({ title: "Dimension deleted" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: duplicateDimension } = useDuplicateDimension({
    mutation: {
      onSuccess() { invalidate(); toast({ title: "Dimension duplicated" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: createValue, isPending: isCreatingVal } = useCreateDimensionValue({
    mutation: {
      onSuccess() { invalidate(); setValDialog({ open: false, dimensionId: null, editTarget: null }); toast({ title: "Value added" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: updateValue, isPending: isUpdatingVal } = useUpdateDimensionValue({
    mutation: {
      onSuccess() { invalidate(); setValDialog({ open: false, dimensionId: null, editTarget: null }); toast({ title: "Value updated" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: deleteValue } = useDeleteDimensionValue({
    mutation: {
      onSuccess() { invalidate(); setDeleteValTarget(null); toast({ title: "Value deleted" }); },
      onError(err) { toastError(toast, err); },
    },
  });

  function openCreateDim() {
    const maxOrder = dimensions.reduce((max, d) => Math.max(max, d.order), -1);
    setDimForm({ ...EMPTY_DIM, order: String(maxOrder + 1) });
    setDimDialog({ open: true, editTarget: null });
  }

  function openEditDim(dim: DimensionWithValues) {
    setDimForm({ name: dim.name, code: dim.code, order: String(dim.order), enabled: dim.enabled });
    setDimDialog({ open: true, editTarget: dim });
  }

  function saveDim() {
    const payload = {
      name: dimForm.name,
      code: dimForm.code,
      enabled: dimForm.enabled,
      ...(dimForm.order !== "" ? { order: Number(dimForm.order) } : {}),
    };
    if (dimDialog.editTarget) {
      updateDimension({ id: dimDialog.editTarget.id, data: payload });
    } else {
      createDimension({ data: payload });
    }
  }

  function openCreateVal(dimensionId: number, existingValues: DimensionValue[]) {
    const maxOrder = existingValues.reduce((max, v) => Math.max(max, v.order), -1);
    setValForm({ ...EMPTY_VAL, order: String(maxOrder + 1) });
    setValDialog({ open: true, dimensionId, editTarget: null });
  }

  function openEditVal(dimension: DimensionWithValues, value: DimensionValue) {
    setValForm({ label: value.label, shortCode: value.shortCode, order: String(value.order), enabled: value.enabled });
    setValDialog({ open: true, dimensionId: dimension.id, editTarget: value });
  }

  function saveVal() {
    const payload = {
      label: valForm.label,
      shortCode: valForm.shortCode,
      enabled: valForm.enabled,
      ...(valForm.order !== "" ? { order: Number(valForm.order) } : {}),
    };
    if (valDialog.editTarget) {
      updateValue({ id: valDialog.dimensionId!, valueId: valDialog.editTarget.id, data: payload });
    } else {
      createValue({ id: valDialog.dimensionId!, data: payload });
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dimensions</h1>
          <p className="text-muted-foreground mt-1">Define the building blocks of your naming conventions.</p>
        </div>
        <Button onClick={openCreateDim}>
          <Plus className="h-4 w-4 mr-2" />
          Add dimension
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : dimensions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No dimensions yet.</p>
            <p className="text-xs mt-1">Create your first dimension to define naming structure.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dimensions.map((dim) => {
            const isOpen = expandedIds.has(dim.id);
            const values = dim.values ?? [];
            return (
              <Card key={dim.id} className={dim.enabled ? "" : "opacity-60"}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dim.enabled}
                      onCheckedChange={() => updateDimension({ id: dim.id, data: { enabled: !dim.enabled } })}
                      aria-label="Toggle enabled"
                    />
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      onClick={() => toggleExpanded(dim.id)}
                    >
                      <span className="font-medium text-sm">{dim.name}</span>
                      <Badge variant="outline" className="text-xs font-mono py-0">[{dim.code}]</Badge>
                      <span className="text-xs text-muted-foreground ml-1">order: {dim.order}</span>
                      <span className="text-xs text-muted-foreground ml-auto mr-2">{values.length} value{values.length !== 1 ? "s" : ""}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditDim(dim)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => duplicateDimension({ id: dim.id })}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteDimTarget(dim)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="pt-0 pb-4 px-4">
                    <div className="border-t pt-4 space-y-2">
                      {values.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No values — add some below.</p>
                      ) : (
                        values.map((val) => (
                          <div
                            key={val.id}
                            className={`flex items-center gap-3 rounded-md border bg-secondary/20 px-3 py-2 ${val.enabled ? "" : "opacity-50"}`}
                          >
                            <Switch
                              checked={val.enabled}
                              onCheckedChange={() => updateValue({ id: dim.id, valueId: val.id, data: { enabled: !val.enabled } })}
                              aria-label="Toggle value"
                              className="scale-90"
                            />
                            <span className="text-sm flex-1">{val.label}</span>
                            <span className="text-xs text-muted-foreground">order: {val.order}</span>
                            <Badge variant="secondary" className="text-xs font-mono">{val.shortCode}</Badge>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditVal(dim, val)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteValTarget({ dimension: dim, value: val })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-dashed"
                        onClick={() => openCreateVal(dim.id, values)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add value
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dimDialog.open} onOpenChange={(v) => setDimDialog({ open: v, editTarget: dimDialog.editTarget })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dimDialog.editTarget ? "Edit dimension" : "Create dimension"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Region"
                  value={dimForm.name}
                  onChange={(e) => setDimForm({ ...dimForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="REGION"
                  value={dimForm.code}
                  onChange={(e) => setDimForm({ ...dimForm, code: e.target.value.toUpperCase().replace(/\s/g, "_") })}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={dimForm.order}
                onChange={(e) => setDimForm({ ...dimForm, order: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in the Generator.</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Used in format templates as <code className="bg-muted px-1 rounded">[{dimForm.code || "CODE"}]</code>.
            </p>
            <div className="flex items-center gap-2">
              <Switch
                id="dim-enabled"
                checked={dimForm.enabled}
                onCheckedChange={(v) => setDimForm({ ...dimForm, enabled: v })}
              />
              <Label htmlFor="dim-enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDimDialog({ open: false, editTarget: null })}>Cancel</Button>
            <Button onClick={saveDim} disabled={!dimForm.name || !dimForm.code || isCreatingDim || isUpdatingDim}>
              {isCreatingDim || isUpdatingDim ? "Saving…" : dimDialog.editTarget ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={valDialog.open}
        onOpenChange={(v) => setValDialog({ open: v, dimensionId: valDialog.dimensionId, editTarget: valDialog.editTarget })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{valDialog.editTarget ? "Edit value" : "Add value"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  placeholder="North America"
                  value={valForm.label}
                  onChange={(e) => setValForm({ ...valForm, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short code</Label>
                <Input
                  placeholder="NAM"
                  value={valForm.shortCode}
                  onChange={(e) => setValForm({ ...valForm, shortCode: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={valForm.order}
                onChange={(e) => setValForm({ ...valForm, order: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in the Generator dropdown.</p>
            </div>
            <p className="text-xs text-muted-foreground">The short code replaces the dimension token in generated outputs.</p>
            <div className="flex items-center gap-2">
              <Switch
                id="val-enabled"
                checked={valForm.enabled}
                onCheckedChange={(v) => setValForm({ ...valForm, enabled: v })}
              />
              <Label htmlFor="val-enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValDialog({ open: false, dimensionId: null, editTarget: null })}>Cancel</Button>
            <Button onClick={saveVal} disabled={!valForm.label || !valForm.shortCode || isCreatingVal || isUpdatingVal}>
              {isCreatingVal || isUpdatingVal ? "Saving…" : valDialog.editTarget ? "Save changes" : "Add value"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDimTarget} onOpenChange={() => setDeleteDimTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete dimension</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteDimTarget?.name}</strong>? All its values will also be removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDimTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteDimension({ id: deleteDimTarget!.id })}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteValTarget} onOpenChange={() => setDeleteValTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete value</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteValTarget?.value?.label}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteValTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteValue({
                  id: deleteValTarget!.dimension.id,
                  valueId: deleteValTarget!.value.id,
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
