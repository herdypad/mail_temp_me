# Panduan DNS - Domain: aniyahapp.my.id

## MX Record (WAJIB)

Type: MX
Name: @
Value: mail.aniyahapp.my.id
Priority: 10
TTL: 3600

## SPF Record (WAJIB)

Type: TXT
Name: @
Value: "v=spf1 ip4:47.237.213.44 -all"
TTL: 3600
```

## A Record untuk Mail Server (WAJIB)

Type: A
Name: mail
Value: 47.237.213.44
TTL: 3600
```

## Testing untuk Kedua Domain cara cek di terminal:

### Test MX Record:
```bash
nslookup -type=MX aniyahapp.my.id
# Output yang benar: aniyahapp.my.id MX preference = 10, mail exchanger = 8.215.48.142
```

### Test SPF Record:
```bash
nslookup -type=TXT aniyahapp.my.id
# Output: "v=spf1 ip4:192.168.1.100 -all"
```

### Test Kirim Email:
```bash
# Test untuk aniyahapp.my.id
telnet 192.168.1.100 25
HELO test.com
MAIL FROM: <test@aniyahapp.my.id>
RCPT TO: <user@aniyahapp.my.id>
DATA
Subject: Test Email
Ini test email untuk aniyahapp.my.id
.
QUIT
```

## Catatan Penting:
- Ganti `[IP_PUBLIC_SERVER_ANDA]` dengan IP address server Anda
- Port 25 harus terbuka di firewall
- Tunggu 24-48 jam untuk DNS propagate
- Setup PTR record di provider hosting</content>
<filePath>/Users/herdy/SideJob/email_temp/DNS_SETUP.md


cara cek bis ke web ini

https://mxtoolbox.com/SuperTool.aspx