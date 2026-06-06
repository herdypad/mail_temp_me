Cara Add Domain

di sc tambahkan di .env


di domain dns

## 1 Record untuk Mail Server (Wajib)

Type: A
Name: mail
Value: 47.237.213.44
TTL: 3600


## 2 SPF Record (WAJIB)

Type: TXT
Name: @
Value: "v=spf1 ip4:47.237.213.44 -all"
TTL: 3600