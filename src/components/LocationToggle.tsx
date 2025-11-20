import { Button } from '@/components/ui/button';

export type City = 'London' | 'Sydney' | 'Melbourne' | 'New York';

interface LocationToggleProps {
  selected: City;
  onChange: (city: City) => void;
}

const cityEmojis: Record<City, string> = {
  'London': '🇬🇧',
  'Sydney': '🦘',
  'Melbourne': '☕',
  'New York': '🗽'
};

export function LocationToggle({ selected, onChange }: LocationToggleProps) {
  const cities: City[] = ['London', 'Sydney', 'Melbourne', 'New York'];
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {cities.map(city => (
        <Button
          key={city}
          variant={selected === city ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(city)}
          className="flex-none rounded-xl"
        >
          <span className="mr-1">{cityEmojis[city]}</span>
          {city}
        </Button>
      ))}
    </div>
  );
}
