$source = "D:\PROShael\alshuail-mobile\dist\*"
$dest = "root@213.199.62.185:/var/www/mobile/"
$password = "YaSCBmAN9t5K"

Write-Host "Starting deployment..."
Write-Host "Please enter the password when prompted: $password"

scp -r $source $dest
