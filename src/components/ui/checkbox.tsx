import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "group peer h-5 w-5 shrink-0 cursor-pointer rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3.5 w-3.5 group-data-[state=indeterminate]:hidden" />
        <Minus className="hidden h-3.5 w-3.5 group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
