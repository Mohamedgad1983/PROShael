import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaCoins, FaUsers, FaCheckCircle, FaDownload, FaSearch, FaTimes } from 'react-icons/fa';
import * as XLSX from 'xlsx';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://proshael.onrender.com');

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const DashboardContainer = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  animation: ${fadeIn} 0.6s ease-out;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 3rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
`;

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const DiyaCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.15);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: ${props => props.status === 'completed' ?
      'linear-gradient(90deg, #00b894, #00cec9)' :
      'linear-gradient(90deg, #fdcb6e, #e17055)'};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.4rem;
  color: #2c3e50;
  font-weight: 600;
`;

const StatusBadge = styled.span`
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => props.status === 'completed' ? '#00b894' : '#fdcb6e'};
  color: white;
`;

const CardStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background: #f8f9fa;
  border-radius: 10px;
`;

const StatLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #636e72;
  font-size: 0.95rem;

  svg {
    color: #74b9ff;
  }
`;

const StatValue = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
  color: #2c3e50;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background: #ecf0f1;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 1rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #00b894, #00cec9);
  width: ${props => props.percentage}%;
  transition: width 0.5s ease;
`;

// Modal Styles
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ecf0f1;
`;

const ModalTitle = styled.h3`
  font-size: 1.8rem;
  color: #2c3e50;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #95a5a6;
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
    color: #e74c3c;
  }
`;

const ModalStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 15px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #dfe6e9;
  border-radius: 10px;
  padding: 0.8rem 1rem;
  margin-bottom: 1.5rem;

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1rem;
    margin-right: 0.5rem;
  }

  svg {
    color: #95a5a6;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: #2c3e50;
  color: white;

  th {
    padding: 1rem;
    text-align: right;
    font-weight: 600;
  }
`;

const TableBody = styled.tbody`
  tr {
    border-bottom: 1px solid #ecf0f1;
    transition: background 0.2s;

    &:hover {
      background: #f8f9fa;
    }
  }

  td {
    padding: 1rem;
    text-align: right;
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  height: 250px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.5),
      transparent
    );
    animation: ${shimmer} 2s infinite;
  }
`;

// Main Component
const DiyaDashboard = () => {
  const [diyaCases, setDiyaCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchDiyaDashboard();
  }, []);

  const fetchDiyaDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/diya/dashboard`);
      const data = await response.json();
      if (data.success) {
        setDiyaCases(data.data);
      }
    } catch (error) {
      console.error('Error fetching diya dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContributors = async (activityId) => {
    setModalLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/diya/${activityId}/contributors`);
      const data = await response.json();
      if (data.success) {
        setContributors(data.data);
      }
    } catch (error) {
      console.error('Error fetching contributors:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async (diyaCase) => {
    setSelectedCase(diyaCase);
    await fetchContributors(diyaCase.activity_id);
  };

  const closeModal = () => {
    setSelectedCase(null);
    setContributors([]);
    setSearchTerm('');
  };

  const filteredContributors = contributors.filter(c =>
    c.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.membership_number?.includes(searchTerm) ||
    c.tribal_section?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredContributors.map(c => ({
      'رقم العضوية': c.membership_number,
      'الاسم': c.member_name,
      'الفخذ': c.tribal_section,
      'المبلغ': c.amount,
      'تاريخ المساهمة': c.contribution_date,
      'طريقة الدفع': c.payment_method
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المساهمين');
    XLSX.writeFile(wb, `${selectedCase?.title_ar}_contributors.xlsx`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardContainer>
        <Title>لوحة متابعة الديات</Title>
        <CardsContainer>
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </CardsContainer>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Title>لوحة متابعة الديات</Title>

      <CardsContainer>
        {diyaCases.map((diyaCase) => (
          <DiyaCard
            key={diyaCase.activity_id}
            status={diyaCase.collection_status}
            onClick={() => handleCardClick(diyaCase)}
          >
            <CardHeader>
              <CardTitle>{diyaCase.title_ar}</CardTitle>
              <StatusBadge status={diyaCase.collection_status}>
                {diyaCase.collection_status === 'completed' ? 'مكتمل' : 'جاري'}
              </StatusBadge>
            </CardHeader>

            <CardStats>
              <StatRow>
                <StatLabel>
                  <FaCoins />
                  المبلغ المحصل
                </StatLabel>
                <StatValue>{formatCurrency(diyaCase.total_collected)}</StatValue>
              </StatRow>

              <StatRow>
                <StatLabel>
                  <FaUsers />
                  عدد المساهمين
                </StatLabel>
                <StatValue>{diyaCase.total_contributors}</StatValue>
              </StatRow>

              <StatRow>
                <StatLabel>
                  <FaCheckCircle />
                  المستهدف
                </StatLabel>
                <StatValue>{formatCurrency(diyaCase.target_amount)}</StatValue>
              </StatRow>
            </CardStats>

            <ProgressBar>
              <ProgressFill
                percentage={(diyaCase.total_collected / diyaCase.target_amount) * 100}
              />
            </ProgressBar>
          </DiyaCard>
        ))}
      </CardsContainer>

      {selectedCase && (
        <Modal onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedCase.title_ar} - قائمة المساهمين</ModalTitle>
              <CloseButton onClick={closeModal}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>

            <ModalStats>
              <div>
                <strong>إجمالي المساهمين:</strong> {contributors.length}
              </div>
              <div>
                <strong>المبلغ الإجمالي:</strong> {formatCurrency(selectedCase.total_collected)}
              </div>
              <div>
                <strong>متوسط المساهمة:</strong> {formatCurrency(selectedCase.average_contribution)}
              </div>
            </ModalStats>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <SearchBar>
                <FaSearch />
                <input
                  type="text"
                  placeholder="بحث بالاسم، رقم العضوية، أو الفخذ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchBar>

              <ExportButton onClick={exportToExcel}>
                <FaDownload />
                تصدير Excel
              </ExportButton>
            </div>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                جاري التحميل...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <th>رقم العضوية</th>
                    <th>الاسم</th>
                    <th>الفخذ</th>
                    <th>المبلغ</th>
                    <th>التاريخ</th>
                    <th>طريقة الدفع</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredContributors.length > 0 ? (
                    filteredContributors.map((contributor, index) => (
                      <tr key={index}>
                        <td>{contributor.membership_number}</td>
                        <td>{contributor.member_name}</td>
                        <td>{contributor.tribal_section || 'غير محدد'}</td>
                        <td>{formatCurrency(contributor.amount)}</td>
                        <td>{new Date(contributor.contribution_date).toLocaleDateString('ar-SA')}</td>
                        <td>{contributor.payment_method}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#95a5a6' }}>
                        لا توجد مساهمات مسجلة حالياً
                      </td>
                    </tr>
                  )}
                </TableBody>
              </Table>
            )}
          </ModalContent>
        </Modal>
      )}
    </DashboardContainer>
  );
};

export default DiyaDashboard;