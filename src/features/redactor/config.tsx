import type { ReactNode } from 'react';
import {
  BadgeInfo,
  CalendarDays,
  CreditCard,
  FileText,
  Hash,
  IdCard,
  Image as ImageIcon,
  Landmark,
  Link2,
  Mail,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Receipt,
  Tag,
  Shield,
} from 'lucide-react';

import {
  APP_LIMITS,
  DETECTION_TYPE_LABELS as BASE_DETECTION_TYPE_LABELS,
  DETECTION_TYPE_ORDER as BASE_DETECTION_TYPE_ORDER,
} from '../../lib/app-config';
import type { DetectionSource, DetectionStatus, DetectionType, ExportMode, FilterState } from '../../types';

export interface DetectionTypeMeta {
  type: DetectionType;
  shortLabel: string;
  pluralLabel: string;
  icon: (props?: { size?: number; className?: string }) => ReactNode;
}

export interface ReviewFilterTab {
  label: string;
  status: DetectionStatus;
}

export interface UploadHintMeta {
  id: 'privacy' | 'analytics' | 'limits' | 'ocr';
  label: string;
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
    type: 'postal',
    shortLabel: BASE_DETECTION_TYPE_LABELS.postal,
    pluralLabel: 'Postal codes',
    icon: (props?: IconProps) => <MapPin {...iconProps(props)} />,
  },
  {
    type: 'address',
    shortLabel: BASE_DETECTION_TYPE_LABELS.address,
    pluralLabel: 'Addresses',
    icon: (props?: IconProps) => <MapPinned {...iconProps(props)} />,
  },
  {
    type: 'vat',
    shortLabel: BASE_DETECTION_TYPE_LABELS.vat,
    pluralLabel: 'VAT numbers',
    icon: (props?: IconProps) => <Receipt {...iconProps(props)} />,
  },
  {
    type: 'nationalId',
    shortLabel: BASE_DETECTION_TYPE_LABELS.nationalId,
    pluralLabel: 'National IDs',
    icon: (props?: IconProps) => <IdCard {...iconProps(props)} />,
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

export const REVIEW_STATUS_ORDER: DetectionStatus[] = ['unconfirmed', 'confirmed'];
export const REVIEW_SOURCE_ORDER: DetectionSource[] = ['rule', 'manual'];
export const REVIEW_STATUS_LABELS: Record<DetectionStatus, string> = {
  unconfirmed: 'Unconfirmed',
  confirmed: 'Confirmed',
};
export const REVIEW_FILTER_TABS: ReviewFilterTab[] = REVIEW_STATUS_ORDER.map((status) => ({
  label: REVIEW_STATUS_LABELS[status],
  status,
}));

export const DEFAULT_REVIEW_FILTERS: FilterState = {
  statuses: REVIEW_STATUS_ORDER,
  sources: REVIEW_SOURCE_ORDER,
  types: DETECTION_TYPE_ORDER,
};

export const UPLOAD_HINTS: UploadHintMeta[] = [
  {
    id: 'privacy',
    label: 'No document uploads',
    icon: (props?: IconProps) => <Shield {...iconProps(props)} />,
  },
  {
    id: 'analytics',
    label: 'Analytics never include document contents',
    icon: (props?: IconProps) => <BadgeInfo {...iconProps(props)} />,
  },
  {
    id: 'limits',
    label: `PDF · up to ${APP_LIMITS.maxFileSizeMb} MB · ${APP_LIMITS.maxPages} pages`,
    icon: (props?: IconProps) => <FileText {...iconProps(props)} />,
  },
  {
    id: 'ocr',
    label: 'OCR auto-fallback for scans',
    icon: (props?: IconProps) => <ImageIcon {...iconProps(props)} />,
  },
] as const;

export const REDACTOR_PAGE_ID_PREFIX = 'page';
export const REVIEW_ITEM_ID_PREFIX = 'review-item';

export const getPageAnchorId = (pageIndex: number) => `${REDACTOR_PAGE_ID_PREFIX}-${pageIndex}`;
export const getReviewItemAnchorId = (itemId: string) => `${REVIEW_ITEM_ID_PREFIX}-${itemId}`;

export const EXPORT_MODE_META: Record<
  ExportMode,
  {
    actionLabel: string;
    filenameSuffix: string;
  }
> = {
  'true-redaction': {
    actionLabel: 'Export',
    filenameSuffix: '-redacted.pdf',
  },
  flattened: {
    actionLabel: 'Flattened fallback',
    filenameSuffix: '-flattened-redacted.pdf',
  },
};

export const PRIMARY_EXPORT_MODE: ExportMode = 'true-redaction';
export const FALLBACK_EXPORT_MODE: ExportMode = 'flattened';

export const REDACTOR_UI = {
  defaultZoom: 1,
  minZoom: 0.5,
  maxZoom: 4,
  zoomStep: 0.1,
  viewerBaseWidth: 780,
} as const;

export const REDACTOR_INTERACTION = {
  minManualBoxSize: 0.01,
  minTextSelectionBoxSize: 0.002,
} as const;
