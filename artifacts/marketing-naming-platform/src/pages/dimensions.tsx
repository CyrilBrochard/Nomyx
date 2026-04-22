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
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  enabled: boolean;
}

interface ValForm {
  label: string;
  shortCode: string;
  enabled: boolean;
}

const EMPTY_DIM: DimForm = { name: "", code: "", enabled: true };
const EMPTY_VAL: ValForm = { label: "", shortCode: "", enabled: true };

export default function Dimensions() {
  const queryClient = useQueryClient();
  const { data: dimensions = [], isLoading } = useListDimensions();
  const { toast } = useToast();

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [dimDialog, setDimDialog] = useState<{ open: boolean; editTarget: any | null }>({ open: false, editTarget: null });
  const [dimForm, setDimForm] = useState<DimForm>(EMPTY_DIM);
  const [deleteDimTarget, setDeleteDimTarget] = useState<any | null>(null);

  const [valDialog, setValDialog] = useState<{ open: boolean; dimensionId: number | null; editTarget: any | null }>({ open: false, dimensionId: null, editTarget: null });
  const [valForm, setValForm] = useState<ValForm>(EMPTY_VAL);
  const [deleteValTarget, setDeleteValTarget] = useState<{ dimension: any; value: any } | null>(null);

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
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  const { mutate: updateDimension, isPending: isUpdatingDim } = useUpdateDimension({
    mutation: {
      onSuccess() { invalidate(); setDimDialog({ open: false, editTarget: null }); toast({ title: "Dimension updated" }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  const { mutate: deleteDimension } = useDeleteDimension({
    mutation: {
      onSuccess() { invalidate(); setDeleteDimTarget(null); toast({ title: "Dimension deleted" }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  const { mutate: duplicateDimension } = useDuplicateDimension({
    mutation: {
      onSuccess() { invalidate(); toast({ title: "Dimension duplicated" }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  const { mutate: createValue, isPending: isCreatingVal } = useCreateDimensionValue({
    mutation: {
      onSuccess() { invalidate(); setValDialog({ open: false, dimensionId: null, editTarget: null }); toast({ title: "Value added" }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  const { mutate: updateValue, isPending: isUpdatingVal } = useUpdateDimensionValue({
    mutation: {
      onSuccess() { invalidate(); setValDialog({ open: false, dimensionId: null, editTarget: null }); toast({ title: "Value updated" }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  const { mutate: deleteValue } = useDeleteDimensionValue({
    mutation: {
      onSuccess() { invalidate(); setDeleteValTarget(null); toast({ title: "Value deleted" }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? err?.message, variant: "destructive" }); },
    },
  });

  function openCreateDim() {
    setDimForm(EMPTY_DIM);
    setDimDialog({ open: true, editTarget: null });
  }

  function openEditDim(dim: any) {
    setDimForm({ name: dim.name, code: dim.code, enabled: dim.enabled });
    setDimDialog({ open: true, editTarget: dim });
  }

  function saveDim() {
    if (dimDialog.editTarget) {
      updateDimension({ id: dimDialog.editTarget.id, data: dimForm });
    } else {
      createDimension({ data: dimForm });
    }
  }

  function openCreateVal(dimensionId: number) {
    setValForm(EMPTY_VAL);
    setValDialog({ open: true, dimensionId, editTarget: null });
  }

  function openEditVal(dimension: any, value: any) {
    setValForm({ label: value.label, shortCode: value.shortCode, enabled: value.enabled });
    setValDialog({ open: true, dimensionId: dimension.id, editTarget: value });
  }

  function saveVal() {
    if (valDialog.editTarget) {
      updateValue({ id: valDialog.dimensionId!, valueId: valDialog.editTarget.id, data: valForm });
    } else {
      createValue({ id: valDialog.dimensionId!, data: valForm });
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
            const values = (dim.values ?? []) as any[];
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
                        values.map((val: any) => (
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
                        onClick={() => openCreateVal(dim.id)}
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
              <p className="text-xs text-muted-foreground">Used in output format templates as <code className="bg-muted px-1 rounded">[{dimForm.code || "CODE"}]</code>.</p>
            </div>
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
              <p className="text-xs text-muted-foreground">This replaces the dimension token in generated outputs.</p>
            </div>
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
