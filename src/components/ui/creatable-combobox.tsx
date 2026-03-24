import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface CreatableComboboxProps {
    options: string[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    emptyText?: string
    createLabel?: string
}

export function CreatableCombobox({
    options,
    value,
    onValueChange,
    placeholder = "Sélectionner...",
    emptyText = "Aucun résultat.",
    createLabel = "Ajouter",
}: CreatableComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    const uniqueOptions = Array.from(new Set(options)).filter(Boolean)

    const handleSelect = (currentValue: string) => {
        onValueChange(currentValue)
        setOpen(false)
        setInputValue("")
    }

    const handleCreate = () => {
        if (inputValue.trim()) {
            handleSelect(inputValue.trim())
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-background"
                >
                    {value || <span className="text-muted-foreground">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder={placeholder}
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 text-center text-sm">
                            {emptyText}
                            {inputValue && (
                                <Button
                                    variant="ghost"
                                    className="w-full mt-2 justify-start px-2 py-1 h-auto font-normal text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={handleCreate}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {createLabel} "{inputValue}"
                                </Button>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {uniqueOptions.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={handleSelect}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                            {inputValue && !uniqueOptions.some(opt => opt.toLowerCase() === inputValue.toLowerCase()) && (
                                <CommandItem
                                    value={inputValue}
                                    onSelect={handleCreate}
                                    className="text-primary font-medium"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {createLabel} "{inputValue}"
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
                <div className="p-1 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-primary font-normal h-8 px-2"
                        onClick={() => {
                            const newValue = window.prompt(`Saisissez la nouvelle valeur :`);
                            if (newValue && newValue.trim()) {
                                handleSelect(newValue.trim());
                            }
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {createLabel}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
