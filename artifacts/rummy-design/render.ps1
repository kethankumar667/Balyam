$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$outputPath = Join-Path $PSScriptRoot 'rummy-desktop-concept.png'
$canvas = [System.Drawing.Bitmap]::new(3200, 2000)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.ScaleTransform(2, 2)
$script:checkedLabels = 0
$colors = @{
    Background = '#0B1511'; Felt = '#142D23'; Surface = '#13221C'
    Line = '#2E4439'; Text = '#F0F3EA'; Muted = '#ACBDB1'
    Quiet = '#879C8E'; Gold = '#E5B751'; Green = '#91D7AE'
    Disabled = '#667E6E'; Paper = '#FFFEF9'; Red = '#B52D40'; Ink = '#19232A'
}
function New-Brush([string]$color) {
    return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
}
function Fill-Rect($x, $y, $width, $height, [string]$color) {
    $brush = New-Brush $color
    $graphics.FillRectangle($brush, [single]$x, [single]$y, [single]$width, [single]$height)
    $brush.Dispose()
}
function Stroke-Line($startX, $startY, $endX, $endY, [string]$color, $weight = 1) {
    $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($color), $weight)
    $graphics.DrawLine($pen, [single]$startX, [single]$startY, [single]$endX, [single]$endY)
    $pen.Dispose()
}
function New-RoundedPath($x, $y, $width, $height, $radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = [single]($radius * 2)
    $path.AddArc([single]$x, [single]$y, $diameter, $diameter, 180, 90)
    $path.AddArc([single]($x + $width - $diameter), [single]$y, $diameter, $diameter, 270, 90)
    $path.AddArc([single]($x + $width - $diameter), [single]($y + $height - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc([single]$x, [single]($y + $height - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}
function Draw-Box($x, $y, $width, $height, [string]$fill, [string]$border = '', $radius = 6, $dashed = $false) {
    $path = New-RoundedPath $x $y $width $height $radius
    $brush = New-Brush $fill
    $graphics.FillPath($brush, $path)
    $brush.Dispose()
    if ($border) {
        $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($border), 1)
        if ($dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash }
        $graphics.DrawPath($pen, $path)
        $pen.Dispose()
    }
    $path.Dispose()
}
function Draw-Text([string]$text, $x, $y, $size, [string]$color, $width = 600, $height = 36, [string]$family = 'Bahnschrift', $bold = $false, [string]$align = 'Near') {
    $style = [System.Drawing.FontStyle]::Regular
    if ($bold) { $style = [System.Drawing.FontStyle]::Bold }
    $font = [System.Drawing.Font]::new($family, [single]$size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Brush $color
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::$align
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $measured = $graphics.MeasureString($text, $font)
    if ($measured.Width -gt ($width + 2) -or $measured.Height -gt ($height + 2)) {
        throw "Label does not fit: '$text' ($($measured.Width) x $($measured.Height), box $width x $height)"
    }
    if ($x -lt 0 -or $y -lt 0 -or ($x + $width) -gt 1600 -or ($y + $height) -gt 1000) {
        throw "Label outside canvas: '$text'"
    }
    $rectangle = [System.Drawing.RectangleF]::new($x, $y, $width, $height)
    $graphics.DrawString($text, $font, $brush, $rectangle, $format)
    $script:checkedLabels++
    $format.Dispose(); $brush.Dispose(); $font.Dispose()
}
function Draw-Dot($x, $y, $radius, [string]$color) {
    $brush = New-Brush $color
    $graphics.FillEllipse($brush, [single]($x - $radius), [single]($y - $radius), [single]($radius * 2), [single]($radius * 2))
    $brush.Dispose()
}
function Draw-Avatar($x, $y, $size, [string]$filename) {
    $image = [System.Drawing.Image]::FromFile((Join-Path $root "client/public/Avatars/$filename"))
    $state = $graphics.Save()
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddEllipse([single]$x, [single]$y, [single]$size, [single]$size)
    $graphics.SetClip($path)
    $sourceSize = [Math]::Min($image.Width, $image.Height)
    $destination = [System.Drawing.RectangleF]::new($x, $y, $size, $size)
    $source = [System.Drawing.RectangleF]::new(($image.Width - $sourceSize) / 2, ($image.Height - $sourceSize) / 2, $sourceSize, $sourceSize)
    $graphics.DrawImage($image, $destination, $source, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Restore($state)
    $path.Dispose(); $image.Dispose()
}
function Draw-Card($x, $y, $width, $height, [string]$rank, [string]$suit, $wild = $false) {
    Draw-Box ($x + 3) ($y + 5) $width $height '#071A12' '' 5
    Draw-Box $x $y $width $height $colors.Paper '#D6DDD2' 5
    $suitColor = $colors.Ink
    if ($suit -eq [string][char]0x2665 -or $suit -eq [string][char]0x2666) { $suitColor = $colors.Red }
    Draw-Text $rank ($x + 9) ($y + 5) 22 $suitColor ($width - 18) 28 'Georgia' $true
    Draw-Text $suit ($x + 9) ($y + 31) 19 $suitColor ($width - 18) 27 'Segoe UI Symbol'
    Draw-Text $suit $x ($y + 60) 38 $suitColor $width 58 'Segoe UI Symbol' $false 'Center'
    Draw-Text $rank ($x + 8) ($y + $height - 35) 19 $suitColor ($width - 16) 27 'Georgia' $true 'Far'
    if ($wild) {
        Draw-Box ($x + 8) ($y + $height - 31) 34 22 '#F4E6B9' '' 4
        Draw-Text 'W' ($x + 8) ($y + $height - 31) 12 '#775315' 34 22 'Bahnschrift' $true 'Center'
    }
}
function Draw-Group($x, [string]$title, [string[]]$ranks, [string]$suit, [string]$status, $valid = $false) {
    $groupWidth = 92 + (($ranks.Count - 1) * 64)
    Draw-Text $title $x 597 14 $colors.Muted $groupWidth 26
    for ($cardIndex = 0; $cardIndex -lt $ranks.Count; $cardIndex++) {
        Draw-Card ($x + $cardIndex * 64) 639 92 158 $ranks[$cardIndex] $suit ($ranks[$cardIndex] -eq '8')
    }
    $statusColor = $colors.Muted
    $marker = [string][char]0x25CB
    if ($valid) { $statusColor = $colors.Green; $marker = [string][char]0x2713 }
    Draw-Text "$marker  $status" $x 814 15 $statusColor $groupWidth 28 'Segoe UI'
}
try {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($colors.Background))
    Fill-Rect 0 0 1600 76 '#101D17'
    Stroke-Line 0 76 1600 76 $colors.Line
    Draw-Text ([string][char]0x2190) 30 21 23 $colors.Muted 30 32 'Segoe UI Symbol'
    Draw-Text 'Leave' 67 21 16 $colors.Muted 64 32
    Stroke-Line 146 22 146 54 $colors.Line
    Draw-Text 'Bhalyam' 174 12 28 $colors.Gold 143 50 'Georgia' $true
    Draw-Text 'RUMMY' 330 23 14 $colors.Text 84 30 'Bahnschrift' $true
    Draw-Text 'POINTS RUMMY' 457 23 13 $colors.Muted 140 30
    Draw-Text '6 PLAYERS' 611 23 13 $colors.Muted 112 30
    Draw-Text 'Table SW5DAY' 1241 23 15 $colors.Muted 140 30
    Draw-Box 1404 18 75 40 '#182A21' $colors.Line
    Draw-Text 'Rules' 1404 18 15 $colors.Text 75 40 'Bahnschrift' $false 'Center'
    Draw-Text ([string][char]0x266A) 1500 22 22 $colors.Muted 35 32 'Segoe UI Symbol' $false 'Center'
    Draw-Text ([string][char]0x263C) 1546 22 22 $colors.Muted 30 32 'Segoe UI Symbol' $false 'Center'

    $players = @('Anand', 'Babji', 'Chinna', 'Damodar', 'Eswari', 'Kethan (You)')
    for ($playerIndex = 0; $playerIndex -lt 6; $playerIndex++) {
        $playerX = 32 + $playerIndex * 204
        if ($playerIndex -eq 5) { Draw-Box $playerX 101 192 98 '#223629' '' 6 }
        Draw-Avatar ($playerX + 9) 111 46 "file_0000000084c48208b1f893419d784cf2_$($playerIndex + 1).jpg"
        Draw-Text $players[$playerIndex] ($playerX + 64) 106 16 $colors.Text 127 28 'Bahnschrift' $true
        $playerStatus = 'Waiting'
        $statusColor = $colors.Muted
        if ($playerIndex -eq 5) { $playerStatus = 'Your turn'; $statusColor = $colors.Gold }
        Draw-Text $playerStatus ($playerX + 64) 135 14 $statusColor 124 24
        Draw-Dot ($playerX + 15) 181 3 $colors.Green
        Draw-Text '13 cards' ($playerX + 25) 166 14 $colors.Muted 78 28
        Draw-Text '0 pts' ($playerX + 135) 166 14 $colors.Muted 52 28
        if ($playerIndex -lt 5) { Stroke-Line ($playerX + 198) 111 ($playerX + 198) 189 $colors.Line }
    }

    Fill-Rect 32 218 1228 746 $colors.Felt
    for ($textureY = 224; $textureY -lt 964; $textureY += 8) {
        Stroke-Line 32 $textureY 1260 $textureY '#172F25' 0.45
    }
    Fill-Rect 32 218 1228 85 '#1D382A'
    Fill-Rect 32 218 4 85 $colors.Gold
    Draw-Text 'YOUR TURN' 56 233 13 $colors.Gold 137 23 'Bahnschrift' $true
    Draw-Text 'Draw a card' 55 257 26 $colors.Text 299 36 'Bahnschrift' $true
    Draw-Dot 384 260 4 $colors.Gold
    Draw-Text '1  Draw' 398 243 17 $colors.Text 110 34 'Bahnschrift' $true
    Stroke-Line 519 260 567 260 '#607461'
    Draw-Text '2  Arrange' 585 243 17 $colors.Muted 125 34
    Stroke-Line 724 260 772 260 '#607461'
    Draw-Text '3  Discard' 791 243 17 $colors.Muted 129 34
    Draw-Text '00:18' 1112 236 27 $colors.Gold 122 45 'Bahnschrift' $true 'Far'

    $deckImage = [System.Drawing.Image]::FromFile((Join-Path $root 'client/public/rummy-card-backs/RUMMY1.png'))
    Draw-Box 79 335 103 150 '#091F15' '#526849' 5
    Draw-Box 76 332 103 150 '#091F15' '#73835C' 5
    Draw-Box 71 327 106 156 '#14282B' $colors.Gold 5
    $deckPath = New-RoundedPath 75 331 98 148 4
    $deckState = $graphics.Save()
    $graphics.SetClip($deckPath)
    $graphics.DrawImage($deckImage, [System.Drawing.RectangleF]::new(75, 331, 98, 148))
    $graphics.Restore($deckState)
    $deckPath.Dispose(); $deckImage.Dispose()
    Draw-Text 'Closed deck' 56 496 17 $colors.Text 144 28 'Bahnschrift' $true 'Center'
    Draw-Text '28 cards' 56 525 14 $colors.Muted 144 25 'Bahnschrift' $false 'Center'
    Draw-Card 243 327 106 156 'J' ([string][char]0x2663)
    Draw-Text 'Discard pile' 224 496 17 $colors.Text 144 28 'Bahnschrift' $true 'Center'
    Draw-Text '1 card' 224 525 14 $colors.Muted 144 25 'Bahnschrift' $false 'Center'
    Stroke-Line 395 332 395 543 '#3B5140'
    Draw-Card 433 327 106 156 '8' ([string][char]0x2666) $true
    Draw-Text 'Wild joker' 414 496 17 $colors.Text 144 28 'Bahnschrift' $true 'Center'
    Draw-Text 'All 8s are wild' 406 525 14 $colors.Muted 160 25 'Bahnschrift' $false 'Center'
    Draw-Box 602 327 106 156 '#193327' '#688163' 5 $true
    Draw-Text ([string][char]0x2691) 602 359 35 $colors.Quiet 106 55 'Segoe UI Symbol' $false 'Center'
    Draw-Text 'Finish slot' 583 496 17 $colors.Muted 144 28 'Bahnschrift' $false 'Center'
    Draw-Text 'Declare to finish' 575 525 14 $colors.Quiet 160 25 'Bahnschrift' $false 'Center'
    Draw-Text 'TABLE ACTIVITY' 828 330 13 $colors.Muted 330 27 'Bahnschrift' $true
    Stroke-Line 828 371 1216 371 '#36503E'
    Draw-Text 'Eswari discarded J' 828 388 16 $colors.Text 291 29
    Draw-Text '11:59' 1152 388 13 $colors.Quiet 64 29 'Bahnschrift' $false 'Far'
    Draw-Text 'Your turn to draw' 828 435 16 $colors.Muted 290 29
    Draw-Text 'Now' 1152 435 13 $colors.Quiet 64 29 'Bahnschrift' $false 'Far'

    Stroke-Line 56 570 1236 570 '#3B5140'
    Draw-Text 'YOUR HAND' 56 583 14 $colors.Text 131 30 'Bahnschrift' $true
    Draw-Text '13 cards / 4 groups' 1025 583 14 $colors.Muted 210 30 'Bahnschrift' $false 'Far'
    Draw-Group 56 '' @('A', '2', '8', '10') ([string][char]0x2660) 'Not a meld'
    Draw-Group 372 '' @('5', '6', '7') ([string][char]0x2665) 'Pure run' $true
    Draw-Group 620 '' @('4', '4', '9') ([string][char]0x2666) 'Not a meld'
    Draw-Group 868 '' @('A', '2', '5') ([string][char]0x2663) 'Not a meld'
    Draw-Box 1121 639 93 158 '#193327' '#58735B' 5 $true
    Draw-Text '+' 1121 677 35 $colors.Muted 93 51 'Bahnschrift' $false 'Center'
    Draw-Text 'Add group' 1121 738 14 $colors.Muted 93 28 'Bahnschrift' $false 'Center'

    Stroke-Line 56 869 1236 869 '#3B5140'
    Draw-Box 56 893 105 48 '#203E2E' '#4A6350'
    Draw-Text ([string][char]0x21C5) 67 901 21 $colors.Muted 28 30 'Segoe UI Symbol'
    Draw-Text 'Sort' 104 901 16 $colors.Text 50 30
    Draw-Box 174 893 104 48 '#203E2E' '#4A6350'
    Draw-Text ([string][char]0x25C7) 186 901 23 $colors.Gold 28 30 'Segoe UI Symbol'
    Draw-Text 'Hint' 222 901 16 $colors.Text 48 30
    Draw-Text 'HAND POINTS' 311 892 12 $colors.Muted 123 23
    Draw-Text '74' 311 915 22 $colors.Text 100 29 'Bahnschrift' $true
    Stroke-Line 453 899 453 938 '#48604B'
    Draw-Text 'GROUP POINTS' 478 892 12 $colors.Muted 136 23
    Draw-Text '56' 478 915 22 $colors.Text 100 29 'Bahnschrift' $true
    Draw-Box 762 892 218 52 '#254333' '#3C5944'
    Draw-Text 'Discard' 782 903 17 $colors.Disabled 129 30 'Bahnschrift' $true
    Draw-Text 'SPACE' 919 903 10 $colors.Disabled 47 30
    Draw-Box 997 892 218 52 '#254333' '#3C5944'
    Draw-Text 'Declare' 1018 903 17 $colors.Disabled 127 30 'Bahnschrift' $true
    Draw-Text 'ENTER' 1154 903 10 $colors.Disabled 46 30

    Fill-Rect 1284 101 284 863 '#14221B'
    Draw-Text 'Chat' 1304 111 19 $colors.Text 65 32 'Bahnschrift' $true
    Draw-Text 'Voice' 1380 111 16 $colors.Muted 71 32
    Draw-Text 'History' 1469 111 16 $colors.Muted 80 32
    Stroke-Line 1304 158 1548 158 $colors.Line
    Stroke-Line 1304 158 1346 158 $colors.Gold 2
    Draw-Text 'TABLE CHAT' 1304 179 12 $colors.Quiet 230 25 'Bahnschrift' $true
    $messages = @(
        @{Name='Anand'; Time='11:58'; First='Old habits. Still hoarding'; Second='all the jokers.'},
        @{Name='Babji'; Time='11:59'; First='Spades first. Every single'; Second='time.'},
        @{Name='Chinna'; Time='11:59'; First='Not dropping this early!'; Second=''},
        @{Name='Damodar'; Time='12:00'; First='Counting my cards out loud.'; Second="Can't help it."},
        @{Name='Eswari'; Time='12:00'; First='Pure sequence first.'; Second='Always.'}
    )
    for ($messageIndex = 0; $messageIndex -lt $messages.Count; $messageIndex++) {
        $messageY = 221 + $messageIndex * 102
        $message = $messages[$messageIndex]
        Draw-Text $message.Name 1304 $messageY 15 $colors.Text 155 25 'Bahnschrift' $true
        Draw-Text $message.Time 1490 $messageY 11 $colors.Quiet 58 25 'Bahnschrift' $false 'Far'
        Draw-Text $message.First 1304 ($messageY + 28) 15 $colors.Muted 246 25
        if ($message.Second) { Draw-Text $message.Second 1304 ($messageY + 53) 15 $colors.Muted 246 25 }
    }
    Draw-Text '6 players online' 1304 763 13 $colors.Quiet 225 27
    Draw-Dot 1539 776 3 $colors.Green
    Stroke-Line 1304 807 1548 807 $colors.Line
    Draw-Box 1304 824 115 38 '#1D3025' $colors.Line
    Draw-Text 'Nice move!' 1304 824 14 $colors.Muted 115 38 'Bahnschrift' $false 'Center'
    Draw-Box 1430 824 118 38 '#1D3025' $colors.Line
    Draw-Text 'Well played!' 1430 824 14 $colors.Muted 118 38 'Bahnschrift' $false 'Center'
    Draw-Box 1304 886 244 57 '#0E1B14' '#3F5544'
    Draw-Text 'Message...' 1318 899 15 $colors.Quiet 171 31
    Draw-Text ([string][char]0x2197) 1504 899 22 $colors.Gold 31 31 'Segoe UI Symbol' $false 'Center'

    $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Rendered: $outputPath"
    Write-Output "Canvas: $($canvas.Width) x $($canvas.Height); checked $script:checkedLabels label bounds; 13 hand cards; 6 avatars."
} finally {
    $graphics.Dispose()
    $canvas.Dispose()
}