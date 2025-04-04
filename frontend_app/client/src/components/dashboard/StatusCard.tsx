import { ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  status?: string;
  statusColor: string;
  borderColor: string;
  iconBgColor: string;
  statusIndicator?: boolean;
  progressBar?: boolean;
  progressValue?: number;
  progressText?: string;
}

export default function StatusCard({
  title,
  value,
  icon,
  status,
  statusColor,
  borderColor,
  iconBgColor,
  statusIndicator = false,
  progressBar = false,
  progressValue = 0,
  progressText,
}: StatusCardProps) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${borderColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <p className="text-3xl font-bold font-['Space_Grotesk'] mt-1">{value}</p>
        </div>
        <div className={`${iconBgColor} p-2 rounded-md`}>
          {icon}
        </div>
      </div>
      
      {progressBar && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`${statusColor} h-2.5 rounded-full`}
              style={{ width: `${progressValue}%` }}
            ></div>
          </div>
          {progressText && <div className="mt-1 text-sm text-gray-500 font-['Roboto_Mono']">{progressText}</div>}
        </div>
      )}
      
      {statusIndicator && (
        <div className="mt-3 text-sm text-gray-500">
          <span className="flex items-center font-['Roboto_Mono']">
            <span className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></span>
            {status}
          </span>
        </div>
      )}
    </div>
  );
}
