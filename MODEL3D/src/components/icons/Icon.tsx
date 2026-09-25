interface IconProps {
  name: string;
  size?: number;
}

export function Icon({ name, size = 17 }: IconProps) {
  return (
    <svg className="icon" style={{ width: size, height: size }} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
