import { useEffect, useMemo, useRef, useState } from "react";

type InvoiceFile = {
  id: string;
  name: string;
  size: number;
  url: string;
  amount: number;
  selected: boolean;
};

type Settings = {
  printer: string;
  copies: number;
  paperSize: "A4" | "A5" | "Letter";
  mode: "page" | "multi" | "booklet";
  scaleMode: "fit" | "actual" | "shrink" | "custom";
  customScale: number;
  duplex: boolean;
  collate: boolean;
  marginPreset: "default" | "narrow" | "none" | "custom";
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  orientation: "auto" | "portrait" | "landscape";
  gray: boolean;
  content: "document" | "documentMark" | "formOnly";
  autoCenter: boolean;
  autoRotate: boolean;
  hideBackground: boolean;
  pageRange: "all" | "current" | "custom";
  customPages: string;
  layout: "single" | "two" | "four";
  cropLine: boolean;
  manifestLayout: "follow" | "after" | "none";
  applyTo: "all" | "selected" | "current";
};

const defaultSettings: Settings = {
  printer: "系统默认打印机",
  copies: 1,
  paperSize: "A4",
  mode: "page",
  scaleMode: "fit",
  customScale: 100,
  duplex: false,
  collate: true,
  marginPreset: "default",
  marginTop: 10,
  marginRight: 10,
  marginBottom: 10,
  marginLeft: 10,
  orientation: "landscape",
  gray: false,
  content: "documentMark",
  autoCenter: true,
  autoRotate: false,
  hideBackground: false,
  pageRange: "all",
  customPages: "1",
  layout: "single",
  cropLine: false,
  manifestLayout: "follow",
  applyTo: "selected",
};

const paperSizeMap = {
  A4: { portrait: "w-[420px] h-[594px]", landscape: "w-[594px] h-[420px]" },
  A5: { portrait: "w-[360px] h-[510px]", landscape: "w-[510px] h-[360px]" },
  Letter: { portrait: "w-[430px] h-[560px]", landscape: "w-[560px] h-[430px]" },
};

function formatMoney(value: number) {
  return `¥ ${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;
}

function parseAmountFromName(name: string) {
  const match = name.match(/(?:¥|￥|amount-|金额)?\s*(\d+(?:\.\d{1,2})?)(?=\s*(?:元|rmb|cny)?\.(?:pdf)$)/i);
  return match ? Number(match[1]) : 0;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function WindowDots() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] ring-1 ring-black/10" />
      <span className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] ring-1 ring-black/10" />
      <span className="h-3.5 w-3.5 rounded-full bg-[#28c840] ring-1 ring-black/10" />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path d="m4.5 10 3.4 3.3 7.6-7.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Header({ title, onReset }: { title: string; onReset?: () => void }) {
  return (
    <header className="flex h-24 items-center justify-between border-b border-slate-100 px-9">
      <div className="flex items-center gap-12">
        <WindowDots />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">上传真实 PDF 发票后再预览、设置和打印</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        {onReset ? <button onClick={onReset} className="text-sm font-semibold text-slate-500 transition hover:text-blue-700">清空文件</button> : null}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-sm text-white ring-4 ring-sky-100">yu</div>
        <span className="h-7 w-px bg-slate-200" />
        <button className="flex flex-col gap-1.5" aria-label="menu">
          <span className="h-0.5 w-6 bg-slate-700" />
          <span className="h-0.5 w-6 bg-slate-700" />
          <span className="h-0.5 w-6 bg-slate-700" />
        </button>
      </div>
    </header>
  );
}

function EmptyState({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <main className="flex flex-1 flex-col bg-[#f7f7f8] p-8">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(event) => onFiles(event.target.files)} />
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative flex animate-[rise_520ms_ease-out] flex-col items-center text-center">
          <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[22px] bg-sky-100 text-sky-500 shadow-sm">
            <svg className="h-24 w-24" viewBox="0 0 96 96" fill="none">
              <path d="M21 12h36l18 18v48a8 8 0 0 1-8 8H21a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8Z" fill="#a9d9fb" />
              <path d="M57 12v18h18" fill="#43aef2" />
              <path d="M48 45v25M35.5 57.5h25" stroke="white" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mb-2 text-lg font-medium text-slate-900">支持批量打印PDF类型文档</p>
          <p className="mb-8 text-sm text-slate-500">不使用演示数据，金额可从文件名识别，也可以上传后手动录入。</p>
          <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-3 rounded-md bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0">
            <span className="relative h-6 w-6 before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:-translate-x-1/2 before:bg-white after:absolute after:left-0 after:top-1/2 after:h-px after:w-full after:-translate-y-1/2 after:bg-white" />
            添加文件
          </button>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-base font-semibold text-slate-800">{children}</span>;
}

function SelectField<T extends string>({ value, onChange, children }: { value: T; onChange: (value: T) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as T)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-base font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
      {children}
    </select>
  );
}

function CheckToggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-2 text-left font-semibold text-slate-700 transition hover:text-blue-700">
      <span className={`flex h-6 w-6 items-center justify-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>
        <CheckIcon />
      </span>
      {label}
    </button>
  );
}

function RadioButton({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-left font-semibold text-slate-700 transition hover:text-blue-700">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${checked ? "border-blue-600" : "border-slate-300"}`}>
        {checked ? <span className="h-3 w-3 rounded-full bg-blue-600" /> : null}
      </span>
      {label}
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="grid rounded-lg border border-slate-200 bg-white p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button key={option.value} onClick={() => onChange(option.value)} className={`rounded-md px-2 py-2 text-sm font-semibold transition ${value === option.value ? "bg-slate-100 text-slate-950" : "text-slate-500 hover:text-slate-900"}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LayoutChoice({ value, selected, onClick }: { value: Settings["layout"]; selected: boolean; onClick: () => void }) {
  const count = value === "single" ? 1 : value === "two" ? 2 : 4;

  return (
    <button onClick={onClick} className={`relative h-24 rounded-lg border bg-white p-2 transition ${selected ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-300"}`}>
      <div className={`grid h-full gap-1 ${value === "single" ? "grid-cols-1" : "grid-cols-2"}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-400">发票</div>
        ))}
      </div>
      {selected ? <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-tl-lg bg-blue-600 text-white"><CheckIcon /></span> : null}
    </button>
  );
}

function FileThumb({ file, index, active, onPick, onToggle, onAmountChange }: {
  file: InvoiceFile;
  index: number;
  active: boolean;
  onPick: () => void;
  onToggle: () => void;
  onAmountChange: (value: number) => void;
}) {
  return (
    <div className={`rounded-lg border bg-white p-3 transition ${active ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"}`}>
      <button onClick={onPick} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded bg-red-50 text-xs font-bold text-red-600 ring-1 ring-red-100">PDF</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{index + 1}. {file.name}</span>
          <span className="mt-1 block text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </span>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onToggle} className={`flex h-8 w-8 items-center justify-center rounded border ${file.selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-transparent"}`}>
          <CheckIcon />
        </button>
        <label className="flex flex-1 items-center rounded border border-slate-200 px-2 text-sm text-slate-500">
          ¥
          <input type="number" min="0" step="0.01" value={file.amount} onChange={(event) => onAmountChange(Number(event.target.value))} className="h-8 min-w-0 flex-1 px-2 text-slate-900 outline-none" />
        </label>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, setSettings, activeFile, selectedCount, selectedAmount, totalAmount, onAmountChange, onPrint }: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  activeFile: InvoiceFile;
  selectedCount: number;
  selectedAmount: number;
  totalAmount: number;
  onAmountChange: (value: number) => void;
  onPrint: () => void;
}) {
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <aside className="flex min-h-0 w-[39rem] flex-col border-l border-slate-200 bg-white px-8 py-6 shadow-[-10px_0_30px_rgba(15,23,42,0.03)]">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-950">打印设置</h2>
        <p className="mt-2 text-sm text-slate-500">所有控件均已绑定状态，预览和金额会随选择变化。</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        <section className="animate-[rise_420ms_ease-out] space-y-4">
          <h3 className="text-lg font-bold text-slate-900">打印机</h3>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>打印机</FieldLabel>
            <SelectField value={settings.printer} onChange={(value) => update("printer", value)}>
              <option>系统默认打印机</option>
              <option>保存为 PDF</option>
              <option>_172_20_7_117</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <FieldLabel>打印份数</FieldLabel>
              <input type="number" min="1" value={settings.copies} onChange={(event) => update("copies", Math.max(1, Number(event.target.value)))} className="h-11 rounded-lg border border-slate-200 px-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="grid grid-cols-[6rem_1fr] items-center gap-3">
              <FieldLabel>纸张大小</FieldLabel>
              <SelectField value={settings.paperSize} onChange={(value) => update("paperSize", value)}>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="Letter">Letter</option>
              </SelectField>
            </label>
          </div>
        </section>

        <section className="mt-7 animate-[rise_520ms_ease-out] space-y-5">
          <h3 className="text-lg font-bold text-slate-900">基础</h3>
          <Segmented value={settings.mode} onChange={(value) => update("mode", value)} options={[{ value: "page", label: "页面大小" }, { value: "multi", label: "一张多页" }, { value: "booklet", label: "小册子" }]} />
          <div className="grid grid-cols-2 gap-3">
            {[{ value: "fit", label: "适合打印边距" }, { value: "actual", label: "实际大小" }, { value: "shrink", label: "缩小过大页面" }, { value: "custom", label: "自定义比例" }].map((item) => (
              <RadioButton key={item.value} checked={settings.scaleMode === item.value} label={item.label} onClick={() => update("scaleMode", item.value as Settings["scaleMode"])} />
            ))}
          </div>
          <label className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>自定义比例</FieldLabel>
            <div className="flex h-11 items-center rounded-lg border border-slate-200 px-3 text-base font-semibold text-slate-800">
              <input type="number" min="10" max="200" value={settings.customScale} onChange={(event) => update("customScale", Number(event.target.value))} className="w-full outline-none disabled:text-slate-300" disabled={settings.scaleMode !== "custom"} />
              <span>%</span>
            </div>
          </label>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <CheckToggle checked={settings.duplex} onChange={(value) => update("duplex", value)} label="双面打印" />
            <CheckToggle checked={settings.collate} onChange={(value) => update("collate", value)} label="逐份打印" />
            <CheckToggle checked={settings.gray} onChange={(value) => update("gray", value)} label="灰度打印" />
          </div>
        </section>

        <section className="mt-7 animate-[rise_620ms_ease-out] space-y-5">
          <h3 className="text-lg font-bold text-slate-900">页面设置</h3>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>页边距</FieldLabel>
            <SelectField value={settings.marginPreset} onChange={(value) => update("marginPreset", value)}>
              <option value="default">默认 10mm</option>
              <option value="narrow">窄 5mm</option>
              <option value="none">无边距</option>
              <option value="custom">自定义</option>
            </SelectField>
          </div>
          {settings.marginPreset === "custom" ? (
            <div className="grid grid-cols-4 gap-2 pl-[8.25rem]">
              {(["marginTop", "marginRight", "marginBottom", "marginLeft"] as const).map((key, index) => (
                <input key={key} type="number" min="0" value={settings[key]} onChange={(event) => update(key, Number(event.target.value))} placeholder={["上", "右", "下", "左"][index]} className="h-10 rounded border border-slate-200 px-2 text-sm outline-none focus:border-blue-500" />
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>纸张方向</FieldLabel>
            <div className="grid grid-cols-3 gap-3">
              {[{ value: "auto", label: "自动" }, { value: "portrait", label: "纵向" }, { value: "landscape", label: "横向" }].map((item) => (
                <RadioButton key={item.value} checked={settings.orientation === item.value} label={item.label} onClick={() => update("orientation", item.value as Settings["orientation"])} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <FieldLabel>排版方式</FieldLabel>
            <div className="grid grid-cols-3 gap-4">
              {(["single", "two", "four"] as const).map((value) => (
                <LayoutChoice key={value} value={value} selected={settings.layout === value} onClick={() => update("layout", value)} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>清单布局</FieldLabel>
            <SelectField value={settings.manifestLayout} onChange={(value) => update("manifestLayout", value)}>
              <option value="follow">清单跟随发票</option>
              <option value="after">清单集中在最后</option>
              <option value="none">不打印清单</option>
            </SelectField>
          </div>
          <CheckToggle checked={settings.cropLine} onChange={(value) => update("cropLine", value)} label="添加裁剪线" />
        </section>

        <section className="mt-7 animate-[rise_720ms_ease-out] space-y-4 pb-5">
          <h3 className="text-lg font-bold text-slate-900">内容</h3>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>打印内容</FieldLabel>
            <SelectField value={settings.content} onChange={(value) => update("content", value)}>
              <option value="documentMark">文档和标注</option>
              <option value="document">仅文档</option>
              <option value="formOnly">仅表单域</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>页面范围</FieldLabel>
            <Segmented value={settings.pageRange} onChange={(value) => update("pageRange", value)} options={[{ value: "all", label: "全部" }, { value: "current", label: "当前" }, { value: "custom", label: "自定义" }]} />
          </div>
          {settings.pageRange === "custom" ? (
            <label className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <FieldLabel>页码</FieldLabel>
              <input value={settings.customPages} onChange={(event) => update("customPages", event.target.value)} placeholder="例如：1,3-5" className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
            </label>
          ) : null}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <CheckToggle checked={settings.autoCenter} onChange={(value) => update("autoCenter", value)} label="自动居中" />
            <CheckToggle checked={settings.autoRotate} onChange={(value) => update("autoRotate", value)} label="自动旋转" />
            <CheckToggle checked={settings.hideBackground} onChange={(value) => update("hideBackground", value)} label="隐藏背景" />
          </div>
          <label className="grid grid-cols-[7rem_1fr] items-center gap-3">
            <FieldLabel>应用于</FieldLabel>
            <SelectField value={settings.applyTo} onChange={(value) => update("applyTo", value)}>
              <option value="selected">已选发票</option>
              <option value="current">当前发票</option>
              <option value="all">全部PDF文档</option>
            </SelectField>
          </label>
        </section>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <label className="mb-4 grid grid-cols-[9rem_1fr] items-center gap-3 text-base text-slate-600">
          当前发票金额
          <div className="flex h-11 items-center rounded-lg border border-slate-200 px-3 font-bold text-slate-950">
            <span className="mr-2">¥</span>
            <input type="number" min="0" step="0.01" value={activeFile.amount} onChange={(event) => onAmountChange(Number(event.target.value))} className="w-full outline-none" />
          </div>
        </label>
        <div className="mb-2 flex items-center justify-between text-base text-slate-600">
          <span>全部发票金额</span>
          <strong className="text-xl text-slate-950">{formatMoney(totalAmount)}</strong>
        </div>
        <div className="mb-5 flex items-center justify-between text-base text-slate-600">
          <span>已选 {selectedCount} 张，金额合计</span>
          <strong className="text-2xl text-slate-950">{formatMoney(selectedAmount)}</strong>
        </div>
        <button onClick={onPrint} className="h-14 w-full rounded-md bg-blue-600 text-xl font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0">
          开始打印
        </button>
      </div>
    </aside>
  );
}

function Preview({ file, files, settings, activeIndex, onPrev, onNext }: {
  file: InvoiceFile;
  files: InvoiceFile[];
  settings: Settings;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const orientation = settings.orientation === "auto" ? "landscape" : settings.orientation;
  const scale = settings.scaleMode === "custom" ? settings.customScale / 100 : settings.scaleMode === "actual" ? 1.08 : settings.scaleMode === "shrink" ? 0.9 : 1;
  const count = settings.layout === "single" ? 1 : settings.layout === "two" ? 2 : 4;
  const previewFiles = [file, ...files.filter((item) => item.id !== file.id)].slice(0, count);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[#f3f3f4] px-10 pt-6">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>预览第 {activeIndex + 1} 张发票：<strong className="text-slate-900">{file.name}</strong></span>
        <span>当前金额：<strong className="text-slate-950">{formatMoney(file.amount)}</strong></span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto rounded-lg bg-white p-8 shadow-sm">
        <div className={`mx-auto grid animate-[previewIn_520ms_ease-out] gap-3 bg-white p-5 shadow-[0_0_0_12px_#fff] ${paperSizeMap[settings.paperSize][orientation]} ${settings.layout === "single" ? "grid-cols-1" : "grid-cols-2"} ${settings.gray ? "grayscale" : ""}`}>
          {settings.cropLine ? <span className="pointer-events-none absolute inset-8 border border-dashed border-slate-300" /> : null}
          {previewFiles.map((item) => (
            <div key={item.id} className={`relative overflow-hidden border border-slate-200 bg-white ${settings.autoCenter ? "flex items-center justify-center" : ""}`}>
              {settings.hideBackground ? null : <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,68,68,0.04)_1px,transparent_1px),linear-gradient(rgba(239,68,68,0.04)_1px,transparent_1px)] bg-[size:18px_18px]" />}
              <object data={item.url} type="application/pdf" className="relative h-full min-h-0 w-full origin-center" style={{ transform: `scale(${scale}) rotate(${settings.autoRotate && orientation === "landscape" ? 0 : 0}deg)` }}>
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
                  <span className="rounded bg-red-50 px-3 py-2 font-bold text-red-600">PDF</span>
                  <span className="max-w-60 break-all text-sm">{item.name}</span>
                </div>
              </object>
              {settings.content !== "document" ? <span className="absolute bottom-2 right-2 rounded bg-blue-600/90 px-2 py-1 text-xs font-semibold text-white">含标注</span> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-16 items-center justify-center gap-6 border-t border-slate-100 bg-white text-slate-500">
        <button onClick={onPrev} className="transition hover:text-blue-700">|‹</button>
        <button onClick={onPrev} className="transition hover:text-blue-700">‹</button>
        <div className="min-w-28 rounded-md border border-slate-200 bg-white px-6 py-2 text-center text-lg font-semibold text-slate-900">{activeIndex + 1}/{files.length}</div>
        <button onClick={onNext} className="transition hover:text-blue-700">›</button>
        <button onClick={onNext} className="transition hover:text-blue-700">›|</button>
      </div>
    </main>
  );
}

export default function App() {
  const [files, setFiles] = useState<InvoiceFile[]>([]);
  const [activeId, setActiveId] = useState("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [printMessage, setPrintMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    urlsRef.current = files.map((file) => file.url);
  }, [files]);

  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const activeIndex = Math.max(0, files.findIndex((file) => file.id === activeId));
  const activeFile = files[activeIndex];
  const selectedFiles = files.filter((file) => file.selected);
  const selectedAmount = useMemo(() => selectedFiles.reduce((sum, file) => sum + file.amount, 0), [selectedFiles]);
  const totalAmount = useMemo(() => files.reduce((sum, file) => sum + file.amount, 0), [files]);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const pdfFiles = Array.from(fileList).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    const added = pdfFiles.map((file) => ({ id: uid(), name: file.name, size: file.size, url: URL.createObjectURL(file), amount: parseAmountFromName(file.name), selected: true }));
    setFiles((current) => [...current, ...added]);
    if (!activeId && added[0]) setActiveId(added[0].id);
  }

  function updateFile(id: string, patch: Partial<InvoiceFile>) {
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, ...patch } : file)));
  }

  function resetFiles() {
    files.forEach((file) => URL.revokeObjectURL(file.url));
    setFiles([]);
    setActiveId("");
    setPrintMessage("");
  }

  function printNow() {
    const targetCount = settings.applyTo === "all" ? files.length : settings.applyTo === "current" ? 1 : selectedFiles.length;
    setPrintMessage(`已按当前设置生成打印任务：${targetCount} 张发票，${settings.copies} 份，${settings.paperSize}，${settings.orientation === "landscape" ? "横向" : settings.orientation === "portrait" ? "纵向" : "自动"}`);
    setTimeout(() => window.print(), 100);
  }

  if (!files.length) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f7f8] text-slate-900">
        <Header title="批量打印" />
        <EmptyState onFiles={addFiles} />
        <footer className="flex h-24 justify-end gap-4 border-t border-slate-200 px-8 py-5">
          <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-10 text-lg font-semibold text-slate-400 transition hover:border-blue-300 hover:text-blue-700">批量打印设置</button>
          <button onClick={() => inputRef.current?.click()} className="rounded-lg bg-blue-500/40 px-10 text-lg font-semibold text-white transition hover:bg-blue-600">开始打印</button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header title="PDF发票打印" onReset={resetFiles} />
      {printMessage ? <div className="bg-blue-50 px-9 py-2 text-sm font-semibold text-blue-700">{printMessage}</div> : null}
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-72 flex-col justify-between border-r border-slate-100 bg-white px-8 py-7">
          <div className="space-y-4 overflow-y-auto pr-1">
            {files.map((file, index) => (
              <FileThumb key={file.id} file={file} index={index} active={activeId === file.id} onPick={() => setActiveId(file.id)} onToggle={() => updateFile(file.id, { selected: !file.selected })} onAmountChange={(amount) => updateFile(file.id, { amount })} />
            ))}
          </div>
          <button onClick={() => inputRef.current?.click()} className="mt-6 flex items-center gap-3 text-xl font-semibold text-blue-600 transition hover:translate-x-1 hover:text-blue-700">
            <span className="relative h-7 w-7 before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:-translate-x-1/2 before:bg-blue-600 after:absolute after:left-0 after:top-1/2 after:h-px after:w-full after:-translate-y-1/2 after:bg-blue-600" />
            添加发票
          </button>
        </nav>
        <Preview file={activeFile} files={files} settings={settings} activeIndex={activeIndex} onPrev={() => setActiveId(files[Math.max(0, activeIndex - 1)].id)} onNext={() => setActiveId(files[Math.min(files.length - 1, activeIndex + 1)].id)} />
        <SettingsPanel settings={settings} setSettings={setSettings} activeFile={activeFile} selectedCount={selectedFiles.length} selectedAmount={selectedAmount} totalAmount={totalAmount} onAmountChange={(amount) => updateFile(activeFile.id, { amount })} onPrint={printNow} />
      </div>
    </div>
  );
}