import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

const ITEM_TYPES = ['instrument', 'reagent', 'software', 'consumable', 'condition'] as const;

const labItemSchema = z.object({
  item_name: z.string().trim().min(1, 'Name is required').max(200),
  item_type: z.enum(ITEM_TYPES, { required_error: 'Type is required' }),
  manufacturer: z.string().trim().max(200).optional().or(z.literal('')),
  model_number: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  quantity: z.coerce.number().int().min(0).default(1),
  specs: z.array(z.object({ key: z.string().default(''), value: z.string().default('') })).default([]),
});

export type LabItemFormValues = z.infer<typeof labItemSchema>;

export interface LabItemDefaultValues {
  item_name?: string;
  item_type?: typeof ITEM_TYPES[number];
  manufacturer?: string;
  model_number?: string;
  description?: string;
  quantity?: number;
  specs?: Array<{ key: string; value: string }>;
}

interface LabItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LabItemFormValues) => Promise<void>;
  defaultValues?: LabItemDefaultValues;
  mode: 'add' | 'edit';
}

const LabItemDialog = ({ open, onOpenChange, onSubmit, defaultValues, mode }: LabItemDialogProps) => {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LabItemFormValues>({
    resolver: zodResolver(labItemSchema),
    defaultValues: {
      item_name: '',
      item_type: undefined,
      manufacturer: '',
      model_number: '',
      description: '',
      quantity: 1,
      specs: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'specs' });

  // Reset when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        item_name: '',
        item_type: undefined,
        manufacturer: '',
        model_number: '',
        description: '',
        quantity: 1,
        specs: [],
        ...defaultValues,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: LabItemFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {mode === 'add' ? 'Add Lab Item' : 'Edit Lab Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="item_name" className="text-sm font-sans">Item Name *</Label>
            <Input id="item_name" {...form.register('item_name')} className="font-sans" />
            {form.formState.errors.item_name && (
              <p className="text-xs text-destructive">{form.formState.errors.item_name.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-sans">Item Type *</Label>
            <Select
              value={form.watch('item_type')}
              onValueChange={(v) => form.setValue('item_type', v as typeof ITEM_TYPES[number], { shouldValidate: true })}
            >
              <SelectTrigger className="font-sans">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="font-sans capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.item_type && (
              <p className="text-xs text-destructive">{form.formState.errors.item_type.message}</p>
            )}
          </div>

          {/* Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manufacturer" className="text-sm font-sans">Manufacturer</Label>
              <Input id="manufacturer" {...form.register('manufacturer')} className="font-sans" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model_number" className="text-sm font-sans">Model Number</Label>
              <Input id="model_number" {...form.register('model_number')} className="font-sans" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-sans">Description</Label>
            <Textarea id="description" {...form.register('description')} className="font-sans resize-none" rows={3} />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5 w-32">
            <Label htmlFor="quantity" className="text-sm font-sans">Quantity</Label>
            <Input id="quantity" type="number" min={0} {...form.register('quantity')} className="font-sans" />
          </div>

          {/* Specifications (key-value) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-sans">Specifications</Label>
              <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => append({ key: '', value: '' })}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-start">
                <Input
                  placeholder="Key"
                  {...form.register(`specs.${i}.key`)}
                  className="font-sans text-sm flex-1"
                />
                <Input
                  placeholder="Value"
                  {...form.register(`specs.${i}.value`)}
                  className="font-sans text-sm flex-1"
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'add' ? 'Add Item' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LabItemDialog;
