import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sheet, SheetBody, SheetHeader } from './Sheet';

export type DestinationOption = { key: string; label: string; icon: ReactNode };

export type DestinationSection = {
  key: string;
  title?: string;
  destinations: DestinationOption[];
};

type DestinationSheetProps = {
  title: string;
  backLabel: string;
  sections: DestinationSection[];
  current: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
  headerEnd?: ReactNode;
  children?: ReactNode;
  selectCurrent?: string;
};

export function DestinationSheet({
  title,
  backLabel,
  sections,
  current,
  onSelect,
  onClose,
  headerEnd,
  children,
  selectCurrent,
}: DestinationSheetProps) {
  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={backLabel}
        end={headerEnd}
      />
      <SheetBody>
        <div role="radiogroup" aria-label={title} className="flex flex-col">
          {sections.map((section, index) => (
            <DestinationGroup key={section.key} first={index === 0}>
              {section.title && (
                <p className="mx-3 mt-2.5 mb-1 text-[13px] font-medium tracking-[.08em] text-muted uppercase">
                  {section.title}
                </p>
              )}
              {section.destinations.map((destination) => (
                <button
                  key={destination.key}
                  type="button"
                  role="radio"
                  aria-checked={destination.key === current}
                  onClick={() => {
                    if (
                      destination.key === current &&
                      destination.key !== selectCurrent
                    )
                      onClose();
                    else onSelect(destination.key);
                  }}
                  className="flex min-h-13 w-full cursor-pointer items-center gap-4 rounded-xl px-3 text-left text-[17px] active:bg-glow focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
                >
                  {destination.icon}
                  <span className="min-w-0 flex-1">{destination.label}</span>
                  {destination.key === current && (
                    <Check
                      className="size-[22px] text-focus-ring"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </DestinationGroup>
          ))}
        </div>
      </SheetBody>
      {children}
    </Sheet>
  );
}

function DestinationGroup({
  first,
  children,
}: {
  first: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {!first && <hr className="my-1.5 h-px border-0 bg-line" />}
      {children}
    </>
  );
}
