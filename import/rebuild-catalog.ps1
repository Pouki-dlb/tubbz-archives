<#
  rebuild-catalog.ps1 — Régénère data.js + les images depuis import/catalogue.xlsx
  =============================================================================
  À LANCER EN LOCAL, SANS IA. Prérequis : Windows + PowerShell + ImageMagick.
  (ImageMagick : si absent -> "winget install ImageMagick.ImageMagick")

  UTILISATION :
    1) Mets à jour ton Google Sheet, puis Fichier > Télécharger > Microsoft Excel (.xlsx).
    2) Remplace  import/catalogue.xlsx  par le fichier téléchargé (même nom).
    3) Clic droit sur ce script > "Exécuter avec PowerShell"
       (ou dans un terminal :  pwsh -File import\rebuild-catalog.ps1 )
    4) Vérifie le résumé affiché, ouvre index.html, puis git add / commit / push.

  OPTIONS :
    -Force   retraite TOUTES les images (par défaut : seules les images manquantes
             sont générées -> rapide quand tu ajoutes juste quelques figurines).

  RÈGLES (identiques à l'import initial) :
    - Colonnes : A=Collection, B=#, C=photo, D=Name, E=année, F=1st, G=photo FE,
      H=Boxed, I=photo Boxed, L=commentaires.
    - id = collection + '-' + nom (minuscules, accents retirés, espaces -> tirets).
    - Variante classic|first-edition si F ∈ {0,1} ; classic|boxed si H ∈ {0,1}
      (pas si la cellule vaut X ou est vide).
    - "Only XL" (commentaire) OU nom contenant "Giant"/"XL Edition" -> variante unique xl|boxed.
    - limitedTo = "Limited to N units" (commentaires) ; éditions spéciales -> description.
    - Numéro illisible (transformé en date par Excel) -> "99".
    - "Orca Boat" et lignes vides ignorés ; ids en double -> suffixe -2, -3...
    - Les figurines présentes dans data.js mais ABSENTES du tableau sont CONSERVÉES
      (ex. Borderlands 3, Fallout Vault Girl). Le tableau fait foi pour les autres.
    - Images : détourage du fond + carré 1:1 + 400x400 + webp qualité 75.

  IMPORTANT — data.js est un fichier GÉNÉRÉ :
    * Corrige les figurines du tableau DANS LE GOOGLE SHEET, pas à la main dans data.js
      (toute retouche manuelle d'une figurine issue du tableau sera écrasée au prochain run).
    * Deux figurines avec le même nom+collection produisent le même id : donne-leur des
      NOMS DISTINCTS dans le Sheet (ex. "Bruce" et "Bruce (XL)") plutôt que de renommer
      l'id dans data.js — sinon le doublon revient à chaque exécution.
    * Ne lance pas ce script pendant que tu édites data.js à la main.
#>
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$here    = $PSScriptRoot
$root    = Split-Path -Parent $here
$xlsx    = Join-Path $here 'catalogue.xlsx'
$dataPath= Join-Path $root 'data.js'
$imgOut  = Join-Path $root 'images'

if (-not (Test-Path $xlsx)) { throw "Fichier introuvable : $xlsx" }
$magick = (Get-Command magick -ErrorAction SilentlyContinue).Source
if (-not $magick) { $magick = (Get-ChildItem 'C:\Program Files\ImageMagick*\magick.exe' -ErrorAction SilentlyContinue | Select-Object -First 1).FullName }
if (-not $magick) { throw "ImageMagick introuvable. Installe-le : winget install ImageMagick.ImageMagick" }
Write-Host "ImageMagick : $magick"

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsx)
function Read-Entry($name){ $e=$zip.GetEntry($name); if(-not $e){return $null}; $sr=New-Object IO.StreamReader($e.Open(),[Text.Encoding]::UTF8); $t=$sr.ReadToEnd(); $sr.Dispose(); return $t }

# ---------- lecture du tableur ----------
[xml]$ss = Read-Entry 'xl/sharedStrings.xml'
$strings = @($ss.sst.si | ForEach-Object { $_.InnerText })
[xml]$sh = Read-Entry 'xl/worksheets/sheet1.xml'
function CellVal($r,$cl){ $c=$r.c | Where-Object {($_.r -replace '\d','') -eq $cl}; if(-not $c){return ''}; if($c.t -eq 's'){return $strings[[int]$c.v]}; if($null -ne $c.v){return [string]$c.v}; return '' }

# ---------- images : (ligne,colonne) -> entrée média ----------
[xml]$rels = Read-Entry 'xl/drawings/_rels/drawing1.xml.rels'
$rid2media=@{}; foreach($rel in $rels.Relationships.Relationship){ $rid2media[$rel.Id]=($rel.Target -replace '\.\./','xl/') }
[xml]$dr = Read-Entry 'xl/drawings/drawing1.xml'
$ns=New-Object System.Xml.XmlNamespaceManager($dr.NameTable)
$ns.AddNamespace('xdr','http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing')
$ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
$rNs='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
$cellImg=@{}
foreach($an in $dr.SelectNodes('//xdr:oneCellAnchor | //xdr:twoCellAnchor',$ns)){
  $col=[int]$an.SelectSingleNode('xdr:from/xdr:col',$ns).InnerText
  $row=[int]$an.SelectSingleNode('xdr:from/xdr:row',$ns).InnerText
  $blip=$an.SelectSingleNode('.//a:blip',$ns)
  if($blip){ $cellImg["$($row+1),$col"]=$rid2media[$blip.GetAttribute('embed',$rNs)] }
}

function Slug($s){
  if(-not $s){return ''}
  $n=$s.Normalize([Text.NormalizationForm]::FormD); $sb=New-Object Text.StringBuilder
  foreach($ch in $n.ToCharArray()){ if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne 'NonSpacingMark'){[void]$sb.Append($ch)} }
  return (($sb.ToString().ToLower() -replace '[^a-z0-9]+','-') -replace '(^-+|-+$)','')
}

# ---------- construction des figurines depuis le tableau ----------
$figs=@()
foreach($r in $sh.worksheet.sheetData.row){
  $rn=[int]$r.r; if($rn -lt 2){continue}
  $name=(CellVal $r 'D').Trim(); if($name -eq ''){continue}
  $coll=(CellVal $r 'A').Trim()
  if($name -match 'Orca Boat'){continue}
  if($name -match '^\?+$' -or $coll -match '^\?+$' -or $coll -eq '-' -or $coll -eq ''){continue}

  $bRaw=(CellVal $r 'B'); $num=$null
  if($bRaw -match '^\d+(\.\d+)?$'){ $bd=[double]::Parse($bRaw,[Globalization.CultureInfo]::InvariantCulture)
    if($bd -gt 40000){$num='99'} elseif($bd -eq [math]::Floor($bd)){$num=[string][int]$bd} else {$num='99'} }
  $eRaw=(CellVal $r 'E'); $year=$null; if($eRaw -ne ''){ $year=($eRaw -replace '\.0$','') }

  $com=(CellVal $r 'L')
  $onlyXL = ($com -match '(?i)only\s*xl') -or ($name -match '(?i)giant|xl edition')
  $limited=$null; $mL=[regex]::Match($com,'(?i)limited to\s*([\d,]+)\s*units'); if($mL.Success){ $limited=[int]($mL.Groups[1].Value -replace ',','') }
  $desc=$com -replace '(?i)only\s*xl','' -replace '(?i)limited to\s*[\d,]+\s*units',''
  $desc=($desc -split "`n" | ForEach-Object { ($_ -replace '(?i)^\s*1st\s*:\s*','').Trim() } | Where-Object { $_ -ne '' }) -join "`n"
  $desc=$desc.Trim(); if($desc -eq ''){$desc=$null}

  $f=(CellVal $r 'F') -replace '\.0$',''; $h=(CellVal $r 'H') -replace '\.0$',''
  $fEx=($f -eq '0' -or $f -eq '1'); $hEx=($h -eq '0' -or $h -eq '1')
  $variants=@()
  if($onlyXL){ $v=[ordered]@{size='xl';packaging='boxed'}; if($limited){$v.limitedTo=$limited}; $variants+=$v }
  else { if($fEx){ $v=[ordered]@{size='classic';packaging='first-edition'}; if($limited){$v.limitedTo=$limited}; $variants+=$v }
         if($hEx){ $variants+=[ordered]@{size='classic';packaging='boxed'} } }
  if($variants.Count -eq 0){ continue }  # rien à archiver

  $figs += [ordered]@{ id=(Slug $coll)+'-'+(Slug $name); name=$name; franchise=$coll; number=$num;
    releaseYear=$year; description=$desc; variants=$variants;
    imgC=$cellImg["$rn,2"]; imgG=$cellImg["$rn,6"]; imgI=$cellImg["$rn,8"] }
}
# déduplication des ids
$seen=@{}; $renamed=@()
foreach($x in $figs){ $b=$x.id; if($seen.ContainsKey($b)){ $seen[$b]++; $x.id="$b-$($seen[$b])"; $renamed+="$($x.name) [$($x.franchise)] -> $($x.id)" } else { $seen[$b]=1 } }
$sheetIds = @{}; $figs | ForEach-Object { $sheetIds[$_.id]=$true }

# ---------- entrées à conserver (présentes dans data.js, absentes du tableau) ----------
$preserved=@()
if(Test-Path $dataPath){
  $txt=Get-Content $dataPath -Raw
  $j=$txt -replace '(?s)^.*?window\.TUBBZ_DATA\s*=\s*','' -replace '(?s);\s*$',''
  try{ $old=($j | ConvertFrom-Json).figurines } catch { $old=@() }
  $preserved = $old | Where-Object { -not $sheetIds.ContainsKey($_.id) }
}

# ---------- traitement des images (tableau uniquement ; les préservées gardent les leurs) ----------
$tmp=Join-Path $env:TEMP 'tubbz_media'; New-Item -ItemType Directory -Force -Path $tmp|Out-Null
function Process-One($entry,$out){
  if(-not $entry){ return $false }
  if((-not $Force) -and (Test-Path $out)){ return $true }
  $e=$zip.GetEntry($entry); if(-not $e){ return $false }
  $src=Join-Path $tmp ('in'+[IO.Path]::GetExtension($entry))
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,$src,$true)
  & $magick $src -fuzz 12% -trim +repage -resize 372x372 -background white -gravity center -extent 400x400 -quality 75 $out 2>$null
  return $true
}
$imgN=0; $i=0
foreach($f in $figs){
  $i++
  Process-One $f.imgC (Join-Path $imgOut "$($f.id).webp") | Out-Null
  if($f.variants | Where-Object {$_.size -eq 'classic' -and $_.packaging -eq 'first-edition'}){ if(Process-One $f.imgG (Join-Path $imgOut "$($f.id)-cf.webp")){$imgN++} }
  if($f.variants | Where-Object {$_.size -eq 'classic' -and $_.packaging -eq 'boxed'}){ if(Process-One $f.imgI (Join-Path $imgOut "$($f.id)-cb.webp")){$imgN++} }
  if($f.variants | Where-Object {$_.size -eq 'xl'}){ if(Process-One $f.imgC (Join-Path $imgOut "$($f.id)-xb.webp")){$imgN++} }
  if($i % 25 -eq 0){ Write-Host "  ...images $i / $($figs.Count)" }
}
$zip.Dispose()

# ---------- écriture de data.js ----------
$all=@($preserved)+@($figs) | Sort-Object @{e={$_.franchise}}, @{e={$_.name}}
function J($v){ if($null -eq $v){return 'null'}; return ($v | ConvertTo-Json -Compress) }
$blocks=@()
foreach($f in $all){
  $L=@('    {','      "id": '+(J $f.id)+',','      "name": '+(J $f.name)+',','      "franchise": '+(J $f.franchise)+',')
  if($f.number){ $L+='      "number": '+(J ([string]$f.number))+',' }
  if($f.releaseYear){ $L+='      "releaseYear": '+(J ([string]$f.releaseYear))+',' }
  if($f.description){ $L+='      "description": '+(J $f.description)+',' }
  $vl=@(); foreach($v in $f.variants){ $s='        { "size": '+(J $v.size)+', "packaging": '+(J $v.packaging); if($v.limitedTo){ $s+=', "limitedTo": '+([int]$v.limitedTo) }; $vl+=($s+' }') }
  $L+='      "variants": ['; $L+=($vl -join ",`n"); $L+='      ]'; $L+='    }'
  $blocks+=($L -join "`n")
}
$header=@'
/* data.js — THE CATALOG of Tubbz figurines.
 *
 * This is the only file you need to fill in (e.g. with the output of your scraping).
 * We use a .js file (not .json) so the site works by simply double-clicking
 * index.html (file://), without any server.
 *
 * The content is plain JSON, just assigned to window.TUBBZ_DATA.
 * See README.md for the field details.
 * (Ce fichier peut être régénéré via import/rebuild-catalog.ps1.)
 */
window.TUBBZ_DATA = {
  "meta": {
    "sizes": ["classic", "mini", "xl"],
    "packaging": ["first-edition", "boxed"],
    "labels": {
      "sizes": { "classic": "Classic", "mini": "Mini", "xl": "XL" },
      "packaging": { "first-edition": "First Edition", "boxed": "Boxed" }
    }
  },
  "figurines": [
'@
Set-Content -Path $dataPath -Value ($header + ($blocks -join ",`n") + "`n  ]`n};`n") -Encoding utf8 -NoNewline

# ---------- résumé ----------
Write-Host ""
Write-Host "===================== RÉSUMÉ ====================="
Write-Host ("Figurines du tableau : {0}" -f $figs.Count)
Write-Host ("Conservées (hors tableau) : {0}" -f @($preserved).Count)
Write-Host ("TOTAL dans data.js : {0}" -f @($all).Count)
$n99 = @($figs | Where-Object { $_.number -eq '99' })
Write-Host ("Numéros à corriger (#99) : {0}" -f $n99.Count)
$n99 | ForEach-Object { Write-Host ("   - {0} [{1}]" -f $_.name,$_.franchise) }
Write-Host ("IDs dédupliqués : {0}" -f $renamed.Count)
$renamed | ForEach-Object { Write-Host ("   - {0}" -f $_) }
Write-Host "================================================="
Write-Host "Terminé. Ouvre index.html pour vérifier, puis git add / commit / push."
