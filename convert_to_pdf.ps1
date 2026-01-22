$word = New-Object -ComObject Word.Application
$word.Visible = $false
$docPath = "C:\Users\mzees\OneDrive\Desktop\SAFORA\SAFORA_Phase1_SRS_Condensed.docx"
$pdfPath = "C:\Users\mzees\OneDrive\Desktop\SAFORA\SAFORA_Phase1_SRS_Final.pdf"
$doc = $word.Documents.Open($docPath)
# 17 = wdFormatPDF
$doc.SaveAs([ref] $pdfPath, [ref] 17)
$doc.Close()
$word.Quit()
