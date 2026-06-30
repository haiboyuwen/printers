interface TitleBarProps {
  title: string;
}

export default function TitleBar({ title }: TitleBarProps) {
  return (
    <div className="h-11 bg-gray-100 border-b border-gray-200 flex items-center px-4 flex-shrink-0 select-none">
      {/* Mac traffic lights */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
        <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer" />
        <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
      </div>

      {/* Title */}
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
  );
}
