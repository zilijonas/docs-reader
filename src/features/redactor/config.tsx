import type { ReactNode } from 'react';
import {
  BadgeInfo,
  CalendarDays,
  CreditCard,
  Hash,
  Landmark,
  Link2,
  Mail,
  Pencil,
  Phone,
  Tag,
} from 'lucide-react';

import { APP_LIMITS } from '../../lib/constants';
import { DETECTION_TYPE_LABELS as BASE_DETECTION_TYPE_LABELS, DETECTION_TYPE_ORDER as BASE_DETECTION_TYPE_ORDER } from '../../lib/detectionMetadata';
import type { DetectionSource, DetectionStatus, DetectionType, FilterState } from '../../lib/types';

export interface DetectionTypeMeta {
  type: DetectionType;
  shortLabel: string;
  pluralLabel: string;
  icon: (props?: { size?: number; className?: string }) => ReactNode;
}

type IconProps = {
  size?: number;
  className?: string;
};

const iconProps = ({ size = 14, className }: IconProps = {}) => ({
  size,
  className,
  strokeWidth: 1.5,
});

const detectionTypeMetas = [
  {
    type: 'email',
    shortLabel: BASE_DETECTION_TYPE_LABELS.email,
    pluralLabel: 'Email addresses',
    icon: (props?: IconProps) => <Mail {...iconProps(props)} />,
  },
  {
    type: 'phone',
    shortLabel: BASE_DETECTION_TYPE_LABELS.phone,
    pluralLabel: 'Phone numbers',
    icon: (props?: IconProps) => <Phone {...iconProps(props)} />,
  },
  {
    type: 'url',
    shortLabel: BASE_DETECTION_TYPE_LABELS.url,
    pluralLabel: 'URLs',
    icon: (props?: IconProps) => <Link2 {...iconProps(props)} />,
  },
  {
    type: 'iban',
    shortLabel: BASE_DETECTION_TYPE_LABELS.iban,
    pluralLabel: 'IBANs',
    icon: (props?: IconProps) => <Landmark {...iconProps(props)} />,
  },
  {
    type: 'card',
    shortLabel: BASE_DETECTION_TYPE_LABELS.card,
    pluralLabel: 'Card numbers',
    icon: (props?: IconProps) => <CreditCard {...iconProps(props)} />,
  },
  {
    type: 'date',
    shortLabel: BASE_DETECTION_TYPE_LABELS.date,
    pluralLabel: 'Dates',
    icon: (props?: IconProps) => <CalendarDays {...iconProps(props)} />,
  },
  {
    type: 'id',
    shortLabel: BASE_DETECTION_TYPE_LABELS.id,
    pluralLabel: 'Identifiers',
    icon: (props?: IconProps) => <BadgeInfo {...iconProps(props)} />,
  },
  {
    type: 'number',
    shortLabel: BASE_DETECTION_TYPE_LABELS.number,
    pluralLabel: 'Long numbers',
    icon: (props?: IconProps) => <Hash {...iconProps(props)} />,
  },
  {
    type: 'keyword',
    shortLabel: BASE_DETECTION_TYPE_LABELS.keyword,
    pluralLabel: 'Custom keywords',
    icon: (props?: IconProps) => <Tag {...iconProps(props)} />,
  },
  {
    type: 'manual',
    shortLabel: BASE_DETECTION_TYPE_LABELS.manual,
    pluralLabel: 'Manual boxes',
    icon: (props?: IconProps) => <Pencil {...iconProps(props)} />,
  },
] satisfies DetectionTypeMeta[];

export const DETECTION_TYPE_ORDER = BASE_DETECTION_TYPE_ORDER;
export const DETECTION_TYPE_META: Record<DetectionType, DetectionTypeMeta> = Object.fromEntries(
  detectionTypeMetas.map((meta) => [meta.type, meta]),
) as Record<DetectionType, DetectionTypeMeta>;

export const DETECTION_TYPE_LABELS = BASE_DETECTION_TYPE_LABELS;

export const REVIEW_STATUS_ORDER: DetectionStatus[] = ['suggested', 'approved', 'rejected'];
export const REVIEW_SOURCE_ORDER: DetectionSource[] = ['rule', 'manual'];

export const DEFAULT_REVIEW_FILTERS: FilterState = {
  statuses: REVIEW_STATUS_ORDER,
  sources: REVIEW_SOURCE_ORDER,
  types: DETECTION_TYPE_ORDER,
};

export const UPLOAD_HINTS = [
  'No uploads — ever',
  `PDF · up to ${APP_LIMITS.maxFileSizeMb} MB · ${APP_LIMITS.maxPages} pages`,
  'OCR auto-fallback for scans',
] as const;

export const KEYBOARD_SHORTCUTS = [
  { key: 'A', label: 'approve' },
  { key: 'R', label: 'reject' },
  { key: 'J/K', label: 'navigate' },
] as const;
