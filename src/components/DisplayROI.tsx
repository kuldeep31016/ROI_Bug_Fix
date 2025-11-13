import { memo } from 'react';

interface DisplayROIProps {
  value: number | null | undefined;
}

const DisplayROI = memo(({ value }: DisplayROIProps) => {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < Number.EPSILON) {
    return <span>—</span>;
  }

  return <span>{value.toFixed(2)}</span>;
});

DisplayROI.displayName = 'DisplayROI';

export default DisplayROI;
