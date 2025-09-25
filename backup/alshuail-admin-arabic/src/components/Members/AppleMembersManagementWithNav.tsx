import React from 'react';
import AppleMembersManagement from './AppleMembersManagement';

interface Props {
  onAddMemberClick?: () => void;
}

const AppleMembersManagementWithNav: React.FC<Props> = ({ onAddMemberClick }) => {
  // We'll override the button click behavior by adding a click handler
  React.useEffect(() => {
    // Add event listener to intercept button clicks
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');

      if (button) {
        // Check if this is the Add Member button by looking for the text or icon
        const buttonText = button.textContent || '';
        const hasAddMemberText = buttonText.includes('إضافة عضو') || buttonText.includes('إضافة عضو جديد');
        const hasPlusIcon = button.querySelector('.w-4.h-4') || button.querySelector('[class*="PlusIcon"]');

        if ((hasAddMemberText || hasPlusIcon) && onAddMemberClick) {
          e.preventDefault();
          e.stopPropagation();
          onAddMemberClick();
        }
      }
    };

    // Add the event listener to the document
    document.addEventListener('click', handleButtonClick, true);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleButtonClick, true);
    };
  }, [onAddMemberClick]);

  return <AppleMembersManagement />;
};

export default AppleMembersManagementWithNav;