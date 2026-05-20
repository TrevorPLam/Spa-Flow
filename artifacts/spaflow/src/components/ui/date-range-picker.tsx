"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  value?: { from?: Date; to?: Date }
  onChange?: (range: { from?: Date; to?: Date } | undefined) => void
  placeholder?: string
}

export function DateRangePicker({
  className,
  value,
  onChange,
  placeholder = "Pick a date range",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value as any}
            onSelect={(range) => {
              onChange?.(range as any)
              setOpen(false)
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface DateRangePresetProps {
  className?: string
  value?: { from?: Date; to?: Date }
  onChange?: (range: { from?: Date; to?: Date } | undefined) => void
}

export function DateRangePresets({
  className,
  value,
  onChange,
}: DateRangePresetProps) {
  const presets = [
    {
      label: "Today",
      range: {
        from: new Date(),
        to: new Date(),
      },
    },
    {
      label: "Last 7 days",
      range: {
        from: addDays(new Date(), -7),
        to: new Date(),
      },
    },
    {
      label: "Last 30 days",
      range: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },
    },
    {
      label: "This week",
      range: {
        from: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
        to: new Date(),
      },
    },
    {
      label: "This month",
      range: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
  ]

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
          size="sm"
          onClick={() => onChange?.(preset.range)}
          className={cn(
            value?.from &&
              value?.to &&
              preset.range.from.toDateString() === value.from.toDateString() &&
              preset.range.to.toDateString() === value.to.toDateString()
              ? "bg-primary text-primary-foreground"
              : ""
          )}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
