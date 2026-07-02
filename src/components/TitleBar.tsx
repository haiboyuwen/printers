interface TitleBarProps {
  title: string;
}

export default function TitleBar({ title }: TitleBarProps) {
  return (
    <div className="h-11 bg-gray-100 border-b border-gray-200 flex items-center px-4 flex-shrink-0 select-none">
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
  );
}
