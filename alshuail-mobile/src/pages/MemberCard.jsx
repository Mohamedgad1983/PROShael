/**
 * Member Card Page - بطاقة العضوية
 * 
 * Features:
 * - Display member ID card with QR code
 * - Download as PNG image
 * - Download as PDF
 * - Share functionality
 * 
 * Updated: December 2025
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Download, Share2, QrCode, Image, FileText, CheckCircle } from 'lucide-react'
import { useAuth } from '../App'

const MemberCard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const cardRef = useRef(null)
  const canvasRef = useRef(null)
  
  const [downloading, setDownloading] = useState(false)
  const [downloadType, setDownloadType] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Generate QR code URL
  useEffect(() => {
    const memberData = {
      id: user?.membershipId || user?.membershipNumber || user?.membership_id || 'SH-0000',
      name: user?.name || user?.full_name_ar || 'عضو',
      phone: user?.phone || ''
    }
    // Using QR Server API for QR code generation
    const qrData = encodeURIComponent(JSON.stringify(memberData))
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`)
  }, [user])

  // Convert card to canvas
  const generateCardImage = async () => {
    const card = cardRef.current
    if (!card) return null

    // Create a high-resolution canvas
    const canvas = document.createElement('canvas')
    const scale = 3 // High DPI
    const width = 400
    const height = 250
    
    canvas.width = width * scale
    canvas.height = height * scale
    
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    ctx.fillStyle = gradient
    ctx.roundRect(0, 0, width, height, 16)
    ctx.fill()

    // Draw decorative circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.arc(width + 30, -30, 80, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-20, height + 20, 60, 0, Math.PI * 2)
    ctx.fill()

    // Draw header text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 14px Cairo, Arial'
    ctx.textAlign = 'right'
    ctx.fillText('صندوق عائلة شعيل العنزي', width - 20, 35)
    ctx.font = '10px Cairo, Arial'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fillText('Al-Shuail Family Fund', width - 20, 50)

    // Draw member name
    ctx.fillStyle = 'white'
    ctx.font = 'bold 22px Cairo, Arial'
    ctx.fillText(user?.name || user?.full_name_ar || 'محمد أحمد الشعيل', width - 20, 100)

    // Draw membership ID
    ctx.font = '14px Cairo, Arial'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(`رقم العضوية: ${user?.membershipId || user?.membershipNumber || user?.membership_id || 'SH-0001'}`, width - 20, 125)

    // Draw divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, 160)
    ctx.lineTo(width - 20, 160)
    ctx.stroke()

    // Draw branch info
    ctx.font = '12px Cairo, Arial'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText(`الفخذ: ${user?.branchName || user?.branch_name || user?.tribal_section || 'غير محدد'}`, width - 20, 185)

    // Draw join date
    const joinDate = user?.joinDate || user?.join_date
    const formattedDate = joinDate ? new Date(joinDate).toLocaleDateString('ar-SA') : 'غير محدد'
    ctx.fillText(`تاريخ الانضمام: ${formattedDate}`, width - 20, 205)

    // Draw QR code placeholder (white box)
    ctx.fillStyle = 'white'
    ctx.roundRect(20, 170, 60, 60, 8)
    ctx.fill()

    // Draw QR icon
    ctx.fillStyle = '#667eea'
    ctx.font = '30px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('▣', 50, 210)

    // Draw avatar circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.beginPath()
    ctx.arc(width - 50, 35, 28, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw avatar icon
    ctx.fillStyle = 'white'
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('👤', width - 50, 43)

    return canvas
  }

  // Download as PNG
  const handleDownloadPNG = async () => {
    setDownloading(true)
    setDownloadType('png')

    try {
      const canvas = await generateCardImage()
      if (!canvas) throw new Error('Failed to generate card')

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `membership-card-${user?.membershipId || user?.membershipNumber || 'member'}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }, 'image/png', 1.0)
    } catch (error) {
      console.error('Download error:', error)
      alert('فشل في تحميل البطاقة')
    } finally {
      setDownloading(false)
      setDownloadType(null)
    }
  }

  // Download as PDF
  const handleDownloadPDF = async () => {
    setDownloading(true)
    setDownloadType('pdf')

    try {
      const canvas = await generateCardImage()
      if (!canvas) throw new Error('Failed to generate card')

      // Create PDF using canvas image
      const imgData = canvas.toDataURL('image/png', 1.0)
      
      // Create a simple PDF with the card image
      // Using a basic approach without external libraries
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = 297 // A4 height in mm
      const cardWidth = 160 // Card width in mm
      const cardHeight = 100 // Card height in mm
      const marginLeft = (pdfWidth - cardWidth) / 2
      const marginTop = 40

      // Create PDF content
      const pdfContent = `
        <html>
        <head>
          <title>بطاقة العضوية - صندوق عائلة شعيل</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              margin: 0; 
              padding: 40px; 
              font-family: 'Cairo', Arial, sans-serif;
              direction: rtl;
              text-align: center;
            }
            .header {
              margin-bottom: 30px;
            }
            .header h1 {
              color: #667eea;
              font-size: 24px;
              margin: 0;
            }
            .header p {
              color: #666;
              font-size: 14px;
              margin: 5px 0 0;
            }
            .card-container {
              display: flex;
              justify-content: center;
              margin: 30px 0;
            }
            .card-image {
              max-width: 500px;
              border-radius: 16px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .footer {
              margin-top: 30px;
              color: #999;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>بطاقة العضوية</h1>
            <p>صندوق عائلة شعيل العنزي</p>
          </div>
          <div class="card-container">
            <img src="${imgData}" class="card-image" alt="بطاقة العضوية" />
          </div>
          <div class="footer">
            <p>تم إنشاء هذه البطاقة بتاريخ ${new Date().toLocaleDateString('ar-SA')}</p>
            <p>رقم العضوية: ${user?.membershipId || user?.membershipNumber || user?.membership_id || 'SH-0000'}</p>
          </div>
        </body>
        </html>
      `

      // Open print dialog which allows saving as PDF
      const printWindow = window.open('', '_blank')
      printWindow.document.write(pdfContent)
      printWindow.document.close()
      
      // Wait for image to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('PDF error:', error)
      alert('فشل في إنشاء PDF')
    } finally {
      setDownloading(false)
      setDownloadType(null)
    }
  }

  // Share card
  const handleShare = async () => {
    const shareText = `بطاقة عضوية صندوق عائلة شعيل العنزي\n` +
      `الاسم: ${user?.name || user?.full_name_ar || 'عضو'}\n` +
      `رقم العضوية: ${user?.membershipId || user?.membershipNumber || user?.membership_id || 'SH-0000'}\n` +
      `الفخذ: ${user?.branchName || user?.branch_name || user?.tribal_section || 'غير محدد'}`

    if (navigator.share) {
      try {
        // Try to share with image
        const canvas = await generateCardImage()
        if (canvas) {
          canvas.toBlob(async (blob) => {
            const file = new File([blob], 'membership-card.png', { type: 'image/png' })
            try {
              await navigator.share({
                title: 'بطاقة عضوية - صندوق عائلة شعيل',
                text: shareText,
                files: [file]
              })
            } catch (e) {
              // Fallback to text-only share
              await navigator.share({
                title: 'بطاقة عضوية - صندوق عائلة شعيل',
                text: shareText
              })
            }
          }, 'image/png')
        }
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText)
      alert('تم نسخ بيانات البطاقة')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-fadeIn">
          <div className="bg-emerald-500 text-white rounded-xl p-4 flex items-center gap-3 shadow-lg">
            <CheckCircle size={24} />
            <span className="font-medium">تم تحميل البطاقة بنجاح!</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header-with-back">
        <div className="back-btn" onClick={() => navigate(-1)}>
          <ArrowRight size={20} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">بطاقة العضو</h2>
      </div>

      <div className="page-content flex flex-col items-center pt-6">
        {/* Member Card */}
        <div className="w-full max-w-sm" ref={cardRef}>
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            {/* Card Background */}
            <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-6 text-white">
              {/* Decorative Circle */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full"></div>
              
              {/* Card Header */}
              <div className="relative flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xs opacity-90 leading-relaxed">
                    صندوق عائلة شعيل العنزي
                    <br />
                    <span className="text-[10px]">Al-Shuail Family Fund</span>
                  </h3>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                  {user?.photo_url || user?.avatar ? (
                    <img 
                      src={user.photo_url || user.avatar} 
                      alt="صورة العضو" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
              </div>

              {/* Member Name */}
              <div className="relative">
                <h2 className="text-xl font-bold mb-1">
                  {user?.name || user?.full_name_ar || user?.fullName || 'محمد أحمد الشعيل'}
                </h2>
                <p className="text-sm opacity-90">
                  رقم العضوية: {user?.membershipId || user?.membershipNumber || user?.membership_id || 'SH-0001'}
                </p>
              </div>

              {/* Card Footer */}
              <div className="relative flex justify-between items-end mt-6 pt-4 border-t border-white/20">
                <div className="text-xs opacity-80 leading-relaxed">
                  <div>الفخذ: {user?.branchName || user?.branch_name || user?.tribal_section || 'غير محدد'}</div>
                  <div>
                    تاريخ الانضمام: {
                      (user?.joinDate || user?.join_date) 
                        ? new Date(user?.joinDate || user?.join_date).toLocaleDateString('ar-SA') 
                        : 'غير محدد'
                    }
                  </div>
                </div>
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
                  ) : (
                    <QrCode size={28} className="text-primary-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for Generation */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Download Buttons */}
        <div className="w-full max-w-sm mt-8 space-y-3">
          {/* Download as PNG */}
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
          >
            {downloading && downloadType === 'png' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جاري التحميل...</span>
              </>
            ) : (
              <>
                <Image size={20} />
                <span>تحميل كصورة (PNG)</span>
              </>
            )}
          </button>

          {/* Download as PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
          >
            {downloading && downloadType === 'pdf' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جاري الإنشاء...</span>
              </>
            ) : (
              <>
                <FileText size={20} />
                <span>تحميل كـ PDF</span>
              </>
            )}
          </button>
          
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full py-4 bg-white border-2 border-primary-500 text-primary-500 rounded-xl font-semibold flex items-center justify-center gap-3 transition hover:bg-primary-50"
          >
            <Share2 size={20} />
            مشاركة البطاقة
          </button>
        </div>

        {/* Info Note */}
        <p className="text-center text-gray-400 text-xs mt-6 px-4">
          يمكنك استخدام هذه البطاقة للتعريف بعضويتك في صندوق العائلة
        </p>

        {/* Tips */}
        <div className="w-full max-w-sm mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-blue-600 text-sm text-center">
            💡 اختر "تحميل كصورة" للحفظ السريع أو "PDF" للطباعة
          </p>
        </div>
      </div>
    </div>
  )
}

export default MemberCard
