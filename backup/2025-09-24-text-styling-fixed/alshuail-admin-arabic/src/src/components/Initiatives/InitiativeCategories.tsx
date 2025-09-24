import React from 'react';
import {
  AcademicCapIcon,
  HeartIcon,
  UserGroupIcon,
  HomeIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { InitiativeCategory, InitiativeFilters } from './types';
import { ARABIC_LABELS } from '../../constants/arabic';

interface InitiativeCategoriesProps {
  selectedCategory?: InitiativeCategory;
  onCategorySelect: (category: InitiativeCategory | undefined) => void;
  categoryCounts?: Record<InitiativeCategory, number>;
}

const categoryConfig: Record<InitiativeCategory, {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
  description: string;
}> = {
  education: {
    label: ARABIC_LABELS.education,
    icon: AcademicCapIcon,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    description: 'مبادرات التعليم والتدريب'
  },
  health: {
    label: ARABIC_LABELS.health,
    icon: HeartIcon,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    description: 'الرعاية الصحية والطبية'
  },
  charity: {
    label: ARABIC_LABELS.charity,
    icon: HeartIcon,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    description: 'الأعمال الخيرية والإنسانية'
  },
  community: {
    label: ARABIC_LABELS.community,
    icon: UserGroupIcon,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    description: 'تطوير المجتمع المحلي'
  },
  environment: {
    label: ARABIC_LABELS.environment,
    icon: GlobeAltIcon,
    color: '#84cc16',
    gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
    description: 'حماية البيئة والاستدامة'
  },
  technology: {
    label: ARABIC_LABELS.technology,
    icon: ComputerDesktopIcon,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    description: 'التقنية والابتكار'
  },
  emergency: {
    label: 'طوارئ',
    icon: ExclamationTriangleIcon,
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    description: 'حالات الطوارئ والكوارث'
  },
  infrastructure: {
    label: 'بنية تحتية',
    icon: BuildingOfficeIcon,
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    description: 'تطوير البنية التحتية'
  }
};

const InitiativeCategories: React.FC<InitiativeCategoriesProps> = ({
  selectedCategory,
  onCategorySelect,
  categoryCounts = {}
}) => {
  const categories = Object.keys(categoryConfig) as InitiativeCategory[];

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    direction: 'rtl' as const
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937'
  };

  const categoriesGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px'
  };

  const categoryCardStyle: React.CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const activeCategoryStyle: React.CSSProperties = {
    transform: 'scale(1.02)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    border: '2px solid transparent'
  };

  const categoryIconStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    marginBottom: '8px'
  };

  const categoryLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px'
  };

  const categoryDescStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.4',
    marginBottom: '8px'
  };

  const categoryCountStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '8px',
    position: 'absolute' as const,
    top: '8px',
    left: '8px'
  };

  const allCategoriesStyle: React.CSSProperties = {
    ...categoryCardStyle,
    background: selectedCategory === undefined ?
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
      'rgba(255, 255, 255, 0.6)',
    color: selectedCategory === undefined ? 'white' : '#374151',
    marginBottom: '12px'
  };

  const allCategoriesIconStyle: React.CSSProperties = {
    ...categoryIconStyle,
    color: selectedCategory === undefined ? 'white' : '#667eea'
  };

  const totalCount = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <TagIcon style={{ width: '24px', height: '24px' }} />
        {ARABIC_LABELS.initiativeCategories}
      </div>

      <div
        style={allCategoriesStyle}
        onClick={() => onCategorySelect(undefined)}
        onMouseEnter={(e) => {
          if (selectedCategory !== undefined) {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedCategory !== undefined) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <TagIcon style={allCategoriesIconStyle} />
        <div style={categoryLabelStyle}>جميع الفئات</div>
        <div style={{
          ...categoryDescStyle,
          color: selectedCategory === undefined ? 'rgba(255, 255, 255, 0.8)' : '#6b7280'
        }}>
          عرض جميع المبادرات
        </div>
        {totalCount > 0 && (
          <div style={{
            ...categoryCountStyle,
            background: selectedCategory === undefined ? 'rgba(255, 255, 255, 0.2)' : '#667eea',
            color: selectedCategory === undefined ? 'white' : 'white'
          }}>
            {totalCount}
          </div>
        )}
      </div>

      <div style={categoriesGridStyle}>
        {categories.map((category) => {
          const config = categoryConfig[category];
          const Icon = config.icon;
          const isSelected = selectedCategory === category;
          const count = categoryCounts[category] || 0;

          return (
            <div
              key={category}
              style={{
                ...categoryCardStyle,
                background: isSelected ? config.gradient : 'rgba(255, 255, 255, 0.6)',
                color: isSelected ? 'white' : '#374151',
                ...(isSelected ? activeCategoryStyle : {})
              }}
              onClick={() => onCategorySelect(category)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = `${config.color}15`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <Icon
                style={{
                  ...categoryIconStyle,
                  color: isSelected ? 'white' : config.color
                }}
              />
              <div style={categoryLabelStyle}>{config.label}</div>
              <div style={{
                ...categoryDescStyle,
                color: isSelected ? 'rgba(255, 255, 255, 0.8)' : '#6b7280'
              }}>
                {config.description}
              </div>
              {count > 0 && (
                <div style={{
                  ...categoryCountStyle,
                  background: isSelected ? 'rgba(255, 255, 255, 0.2)' : config.color,
                  color: 'white'
                }}>
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InitiativeCategories;