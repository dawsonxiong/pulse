import type { FeedSource } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { FieldLegend, FieldSet } from "@pulse/ui/components/field";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@pulse/ui/components/popover";
import { ScrollArea } from "@pulse/ui/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@pulse/ui/components/toggle-group";
import { ListFilter, X } from "lucide-react";
import {
  activeFilterCount,
  DATE_FILTERS,
  dateFilterLabel,
  EMPTY_FILTERS,
  filtersActive,
  type DateFilter,
  type StoryFilters,
} from "../lib/filters";
import { SourceIcon } from "./source-icon";

type FeedFiltersProps = {
  filters: StoryFilters;
  sources: FeedSource[];
  onChange: (next: StoryFilters) => void;
};

function setDate(filters: StoryFilters, date: DateFilter): StoryFilters {
  return { ...filters, date };
}

function toggleSource(filters: StoryFilters, id: string): StoryFilters {
  const sourceIds = filters.sourceIds.includes(id)
    ? filters.sourceIds.filter((item) => item !== id)
    : [...filters.sourceIds, id];
  return { ...filters, sourceIds };
}

export function FeedFilterButton({ filters, sources, onChange }: FeedFiltersProps) {
  const count = activeFilterCount(filters);
  const active = filtersActive(filters);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-label={active ? `Filter, ${count} active` : "Filter"}
          />
        }
      >
        <ListFilter data-icon="inline-start" />
        Filter
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Filters</PopoverTitle>
          {active ? (
            <Button variant="ghost" size="xs" onClick={() => onChange(EMPTY_FILTERS)}>
              Clear
            </Button>
          ) : null}
        </PopoverHeader>
        <FieldSet className="gap-1.5">
          <FieldLegend variant="label" className="text-xs text-muted-foreground">
            When
          </FieldLegend>
          <ToggleGroup
            size="sm"
            variant="outline"
            spacing={1}
            value={[filters.date]}
            aria-label="Date"
            className="flex-wrap"
            onValueChange={(value) => {
              const next = DATE_FILTERS.find((option) => option.id === value[0]);
              if (!next) return;
              onChange(setDate(filters, next.id));
            }}
          >
            {DATE_FILTERS.map((option) => (
              <ToggleGroupItem key={option.id} value={option.id}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
        <FieldSet className="gap-1.5">
          <FieldLegend variant="label" className="text-xs text-muted-foreground">
            From
          </FieldLegend>
          {sources.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sources in this feed yet.</p>
          ) : (
            <ScrollArea className="h-44 rounded-lg border border-border">
              <ToggleGroup
                multiple
                orientation="vertical"
                spacing={0}
                size="sm"
                value={filters.sourceIds}
                aria-label="Sources"
                className="w-full items-stretch p-1"
                onValueChange={(value) => onChange({ ...filters, sourceIds: value })}
              >
                {sources.map((source) => (
                  <ToggleGroupItem
                    key={source.id}
                    value={source.id}
                    className="w-full justify-start"
                  >
                    <SourceIcon src={source.iconUrl} label={source.name} />
                    <span className="min-w-0 truncate">{source.name}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </ScrollArea>
          )}
        </FieldSet>
      </PopoverContent>
    </Popover>
  );
}

export function FeedFilterChips({ filters, sources, onChange }: FeedFiltersProps) {
  if (!filtersActive(filters)) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.date !== "any" ? (
        <Button
          type="button"
          variant="secondary"
          size="xs"
          aria-label={`Remove ${dateFilterLabel(filters.date)} filter`}
          onClick={() => onChange(setDate(filters, "any"))}
        >
          {dateFilterLabel(filters.date)}
          <X data-icon="inline-end" />
        </Button>
      ) : null}
      {filters.sourceIds.map((id) => {
        const source = sources.find((item) => item.id === id);
        if (!source) return null;
        return (
          <Button
            key={id}
            type="button"
            variant="secondary"
            size="xs"
            aria-label={`Remove ${source.name} filter`}
            onClick={() => onChange(toggleSource(filters, id))}
          >
            {source.name}
            <X data-icon="inline-end" />
          </Button>
        );
      })}
    </div>
  );
}
