# Panduan DNS - Domain: aniyahapp.my.id

## MX Record (WAJIB)

Type: MX
Name: @
Value: mail.namaDomaim.com
Priority: 10
TTL: 3600

## SPF Record (WAJIB)

Type: TXT
Name: @
Value: "v=spf1 ip4:8.215.48.142 -all"
TTL: 3600
```


## A Record untuk Mail Server (Wajib)

Type: A
Name: mail
Value: 192.168.1.100
TTL: 3600
```

## Testing untuk Kedua Domain:

### Test MX Record:
```bash
nslookup -type=MX aniyahapp.my.id
# Output yang benar: aniyahapp.my.id MX preference = 10, mail exchanger = 192.168.1.100
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