import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';
import {
  MagnifyingGlassIcon,
  UserIcon,
  DocumentArrowDownIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  UserGroupIcon,
  PhoneIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './FamilyTree.css';

const FamilyTree = () => {
  // State management
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());

  // Refs
  const treeContainerRef = useRef(null);
  const treeRef = useRef(null);

  // API configuration
  const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

  // Tree configuration
  const treeConfig = {
    translate: { x: 400, y: 200 },
    zoom: 1,
    separation: { siblings: 2, nonSiblings: 2 },
    nodeSize: { x: 200, y: 150 },
    orientation: 'vertical',
    pathFunc: 'diagonal',
    enableLegacyTransitions: false,
    transitionDuration: 500,
  };

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  };

  // Fetch family tree data
  const fetchFamilyTree = useCallback(async (memberId = null) => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        throw new Error('لا يوجد رمز مصادقة');
      }

      // If no specific member ID, get the root member or first member
      const endpoint = memberId
        ? `${API_URL}/api/family-tree/tree/${memberId}`
        : `${API_URL}/api/family-tree/tree`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطأ في جلب البيانات: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const transformedData = transformDataForD3(data.data);
        setTreeData(transformedData);
      } else {
        throw new Error(data.error || 'فشل في جلب بيانات شجرة العائلة');
      }
    } catch (err) {
      console.error('Error fetching family tree:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Transform backend data to D3 tree format
  const transformDataForD3 = (memberData) => {
    if (!memberData) return null;

    const transform = (member) => {
      const node = {
        name: member.name || 'غير محدد',
        attributes: {
          memberId: member.memberId || member.id,
          phoneNumber: member.phoneNumber,
          balance: member.balance || 0,
          id: member.id,
        },
        children: []
      };

      // Add children if they exist
      if (member.children && member.children.length > 0) {
        node.children = member.children.map(child => transform(child));
      }

      // Add spouse as a sibling node if exists
      if (member.spouse) {
        const spouseNode = {
          name: member.spouse.name || 'غير محدد',
          attributes: {
            memberId: member.spouse.memberId || member.spouse.id,
            phoneNumber: member.spouse.phoneNumber,
            balance: member.spouse.balance || 0,
            id: member.spouse.id,
            isSpouse: true,
          },
          children: []
        };
        node.children.unshift(spouseNode);
      }

      return node;
    };

    return transform(memberData);
  };

  // Search functionality
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);

    if (!term.trim() || !treeData) {
      setHighlightedNodes(new Set());
      return;
    }

    const highlighted = new Set();

    const searchInTree = (node) => {
      const name = node.name?.toLowerCase() || '';
      const memberId = node.attributes?.memberId?.toString() || '';
      const phone = node.attributes?.phoneNumber || '';

      const searchLower = term.toLowerCase();

      if (name.includes(searchLower) ||
          memberId.includes(searchLower) ||
          phone.includes(searchLower)) {
        highlighted.add(node.attributes?.id || node.name);
      }

      if (node.children) {
        node.children.forEach(child => searchInTree(child));
      }
    };

    searchInTree(treeData);
    setHighlightedNodes(highlighted);
  }, [treeData]);

  // Custom node render function
  const renderCustomNodeElement = ({ nodeDatum, toggleNode }) => {
    const isHighlighted = highlightedNodes.has(nodeDatum.attributes?.id);
    const isSpouse = nodeDatum.attributes?.isSpouse;

    return (
      <g>
        {/* Node background circle */}
        <circle
          r={30}
          fill={isSpouse ? "rgba(255, 193, 7, 0.9)" : "rgba(59, 130, 246, 0.9)"}
          stroke={isHighlighted ? "#ef4444" : "#ffffff"}
          strokeWidth={isHighlighted ? "3" : "2"}
          className="node-circle"
          onClick={() => handleNodeClick(nodeDatum)}
          style={{ cursor: 'pointer' }}
        />

        {/* User icon */}
        <foreignObject x="-12" y="-12" width="24" height="24">
          <UserIcon className="text-white w-6 h-6" />
        </foreignObject>

        {/* Name label */}
        <text
          fill="#1f2937"
          strokeWidth="1"
          x="0"
          y="50"
          textAnchor="middle"
          className="node-text"
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'Tajawal, Cairo, sans-serif'
          }}
        >
          {nodeDatum.name}
        </text>

        {/* Member ID */}
        <text
          fill="#6b7280"
          x="0"
          y="65"
          textAnchor="middle"
          style={{
            fontSize: '10px',
            fontFamily: 'Tajawal, Cairo, sans-serif'
          }}
        >
          {nodeDatum.attributes?.memberId && `#${nodeDatum.attributes.memberId}`}
        </text>

        {/* Balance */}
        <text
          fill="#059669"
          x="0"
          y="80"
          textAnchor="middle"
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'Tajawal, Cairo, sans-serif'
          }}
        >
          {nodeDatum.attributes?.balance && `${nodeDatum.attributes.balance} ر.س`}
        </text>

        {/* Expand/collapse indicator */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <circle
            r="8"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="2"
            cx="25"
            cy="-25"
            onClick={(e) => {
              e.stopPropagation();
              toggleNode();
            }}
            style={{ cursor: 'pointer' }}
          />
        )}
      </g>
    );
  };

  // Handle node click
  const handleNodeClick = async (nodeDatum) => {
    try {
      const memberId = nodeDatum.attributes?.id || nodeDatum.attributes?.memberId;
      if (!memberId) return;

      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/family-tree/relationships/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedMember(data.data);
          setShowMemberModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
    }
  };

  // Export as image
  const exportAsImage = async () => {
    if (!treeContainerRef.current) return;

    try {
      const canvas = await html2canvas(treeContainerRef.current, {
        backgroundColor: '#1e293b',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `family-tree-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
    }
  };

  // Export as PDF
  const exportAsPDF = async () => {
    if (!treeContainerRef.current) return;

    try {
      const canvas = await html2canvas(treeContainerRef.current, {
        backgroundColor: '#1e293b',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`family-tree-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Initialize component
  useEffect(() => {
    fetchFamilyTree();
  }, [fetchFamilyTree]);

  // Render loading state
  if (loading) {
    return (
      <div className="family-tree-container">
        <div className="family-tree-loading">
          <div className="loading-spinner"></div>
          <p>جاري تحميل شجرة العائلة...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="family-tree-container">
        <div className="family-tree-error">
          <p>خطأ: {error}</p>
          <button
            onClick={() => fetchFamilyTree()}
            className="retry-button"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // Render main component
  return (
    <div className={`family-tree-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="family-tree-header">
        <div className="header-title">
          <UserGroupIcon className="w-8 h-8 text-blue-400" />
          <h1>شجرة العائلة</h1>
        </div>

        <div className="header-controls">
          {/* Search */}
          <div className="search-container">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم العضوية أو الهاتف..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Export buttons */}
          <button
            onClick={exportAsImage}
            className="control-button"
            title="تصدير كصورة"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
          </button>

          <button
            onClick={exportAsPDF}
            className="control-button"
            title="تصدير كملف PDF"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="control-button"
            title={isFullscreen ? "إغلاق وضع ملء الشاشة" : "وضع ملء الشاشة"}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Tree container */}
      <div
        ref={treeContainerRef}
        className="tree-container"
        id="tree-container"
      >
        {treeData ? (
          <Tree
            ref={treeRef}
            data={treeData}
            orientation="vertical"
            translate={treeConfig.translate}
            zoom={treeConfig.zoom}
            separation={treeConfig.separation}
            nodeSize={treeConfig.nodeSize}
            renderCustomNodeElement={renderCustomNodeElement}
            pathFunc="diagonal"
            enableLegacyTransitions={false}
            transitionDuration={500}
            zoomable={true}
            draggable={true}
            collapsible={true}
            initialDepth={2}
          />
        ) : (
          <div className="no-data">
            <UserGroupIcon className="w-16 h-16 text-gray-400" />
            <p>لا توجد بيانات شجرة العائلة</p>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {showMemberModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="member-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تفاصيل العضو</h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="close-button"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="modal-content">
              <div className="member-info">
                <div className="info-row">
                  <UserIcon className="w-5 h-5 text-blue-400" />
                  <span className="info-label">الاسم:</span>
                  <span className="info-value">{selectedMember.name}</span>
                </div>

                <div className="info-row">
                  <CreditCardIcon className="w-5 h-5 text-green-400" />
                  <span className="info-label">رقم العضوية:</span>
                  <span className="info-value">{selectedMember.memberId}</span>
                </div>

                <div className="info-row">
                  <PhoneIcon className="w-5 h-5 text-purple-400" />
                  <span className="info-label">رقم الهاتف:</span>
                  <span className="info-value">{selectedMember.phoneNumber || 'غير محدد'}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">الرصيد:</span>
                  <span className="info-value balance">{selectedMember.balance || 0} ر.س</span>
                </div>
              </div>

              {/* Relationships */}
              <div className="relationships">
                <h4>العلاقات العائلية</h4>

                {selectedMember.parents && selectedMember.parents.length > 0 && (
                  <div className="relationship-group">
                    <h5>الوالدان:</h5>
                    <ul>
                      {selectedMember.parents.map((parent, index) => (
                        <li key={index}>{parent.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMember.spouse && (
                  <div className="relationship-group">
                    <h5>الزوج/الزوجة:</h5>
                    <p>{selectedMember.spouse.name}</p>
                  </div>
                )}

                {selectedMember.children && selectedMember.children.length > 0 && (
                  <div className="relationship-group">
                    <h5>الأطفال:</h5>
                    <ul>
                      {selectedMember.children.map((child, index) => (
                        <li key={index}>{child.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMember.siblings && selectedMember.siblings.length > 0 && (
                  <div className="relationship-group">
                    <h5>الأشقاء:</h5>
                    <ul>
                      {selectedMember.siblings.map((sibling, index) => (
                        <li key={index}>{sibling.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTree;