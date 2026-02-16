import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import LabItemDialog, { type LabItemFormValues, type LabItemDefaultValues } from '@/components/digital-lab/LabItemDialog';
import type { Json } from '@/integrations/supabase/types';

/* ---------- types ---------- */

interface LabItem {
  id: number;
  item_name: string;
  item_type: string;
  manufacturer: string | null;
  model_number: string | null;
  description: string | null;
  quantity: number | null;
  specifications: Json | null;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

/* ---------- constants ---------- */

const TYPE_TABS = ['all', 'instrument', 'reagent', 'software', 'consumable', 'condition'] as const;

const TYPE_COLORS: Record<string, string> = {
  instrument: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  reagent: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  software: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  consumable: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  condition: 'bg-muted text-muted-foreground',
};

/* ---------- helpers ---------- */

function specsToArray(specs: Json | null): Array<{ key: string; value: string }> {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return [];
  return Object.entries(specs as Record<string, string>).map(([key, value]) => ({ key, value: String(value) }));
}

function arrayToSpecs(arr: Array<{ key?: string; value?: string }>): Record<string, string> {
  const obj: Record<string, string> = {};
  arr.forEach(({ key, value }) => {
    if (key?.trim()) obj[key.trim()] = value ?? '';
  });
  return obj;
}

/* ---------- component ---------- */

const DigitalLabPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingItem, setEditingItem] = useState<LabItem | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LabItem | null>(null);

  /* ── Fetch ── */
  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('digital_lab_inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading inventory', description: error.message, variant: 'destructive' });
    } else {
      setItems((data as LabItem[]) ?? []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── Filtered items ── */
  const filtered = useMemo(() => {
    let result = items;
    if (activeTab !== 'all') result = result.filter((i) => i.item_type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.item_name.toLowerCase().includes(q));
    }
    return result;
  }, [items, activeTab, search]);

  /* ── Add / Edit ── */
  const handleOpenAdd = () => {
    setEditingItem(null);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: LabItem) => {
    setEditingItem(item);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleSubmit = async (values: LabItemFormValues) => {
    if (!user) return;

    const payload = {
      item_name: values.item_name,
      item_type: values.item_type,
      manufacturer: values.manufacturer || null,
      model_number: values.model_number || null,
      description: values.description || null,
      quantity: values.quantity,
      specifications: arrayToSpecs(values.specs) as Json,
      user_id: user.id,
    };

    if (dialogMode === 'add') {
      const { error } = await supabase.from('digital_lab_inventory').insert(payload);
      if (error) {
        toast({ title: 'Failed to add item', description: error.message, variant: 'destructive' });
        throw error;
      }
      toast({ title: 'Item added' });
    } else if (editingItem) {
      const { error } = await supabase
        .from('digital_lab_inventory')
        .update(payload)
        .eq('id', editingItem.id);
      if (error) {
        toast({ title: 'Failed to update item', description: error.message, variant: 'destructive' });
        throw error;
      }
      toast({ title: 'Item updated' });
    }

    fetchItems();
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Optimistic remove
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);

    const { error } = await supabase.from('digital_lab_inventory').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
      fetchItems(); // rollback
    } else {
      toast({ title: 'Item deleted' });
    }
  };

  /* ── Default values for edit ── */
  const editDefaults: LabItemDefaultValues | undefined = editingItem
    ? {
        item_name: editingItem.item_name,
        item_type: editingItem.item_type as LabItemDefaultValues['item_type'],
        manufacturer: editingItem.manufacturer ?? '',
        model_number: editingItem.model_number ?? '',
        description: editingItem.description ?? '',
        quantity: editingItem.quantity ?? 1,
        specs: specsToArray(editingItem.specifications),
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 font-sans text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/researcher-home')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button size="sm" className="gap-1.5 font-sans" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Digital Lab</h1>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Manage your lab's instruments, reagents, software, and resources
          </p>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
              {TYPE_TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="text-xs font-sans capitalize">
                  {t === 'all' ? 'All' : `${t}s`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm font-sans h-9"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-md border border-border bg-card p-4 animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-sans text-muted-foreground">
              {items.length === 0 ? 'No items yet. Add your first lab item!' : 'No items match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border bg-card p-4 space-y-2 hover:shadow-sm transition-shadow"
              >
                {/* Name + type */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-sans text-sm font-semibold text-foreground leading-snug">{item.item_name}</h3>
                  <Badge className={cn('text-[10px] font-sans capitalize border-0 flex-shrink-0', TYPE_COLORS[item.item_type] ?? TYPE_COLORS.condition)}>
                    {item.item_type}
                  </Badge>
                </div>

                {/* Manufacturer / model */}
                {(item.manufacturer || item.model_number) && (
                  <p className="text-xs font-sans text-muted-foreground">
                    {[item.manufacturer, item.model_number].filter(Boolean).join(' · ')}
                  </p>
                )}

                {/* Description */}
                {item.description && (
                  <p className="text-xs font-sans text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Quantity + actions */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-sans text-muted-foreground">
                    Qty: <span className="font-semibold text-foreground">{item.quantity ?? 1}</span>
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <LabItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={editDefaults}
        mode={dialogMode}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Item</AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              Are you sure you want to delete <strong>{deleteTarget?.item_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DigitalLabPage;
