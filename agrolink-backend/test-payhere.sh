#!/bin/bash
SECRET="Mjc3NTcwOTQwMjU4MDA1OTIzMDM5NzAwMDQwODEzOTQ1NDczNzky"
MERCHANT="1234672"
ORDER="e5b15be6"
AMOUNT="244.00"
CURRENCY="LKR"

UPPER_SECRET_HASH=$(echo -n "$SECRET" | md5 | awk '{print $1}' | tr '[:lower:]' '[:upper:]')
HASH_INPUT="${MERCHANT}${ORDER}${AMOUNT}${CURRENCY}${UPPER_SECRET_HASH}"
FINAL_HASH=$(echo -n "$HASH_INPUT" | md5 | awk '{print $1}' | tr '[:lower:]' '[:upper:]')

echo "Generated Hash: $FINAL_HASH"

curl -s -X POST "https://sandbox.payhere.lk/pay/checkout" \
     -d "merchant_id=$MERCHANT" \
     -d "return_url=http://localhost:5173/my-orders" \
     -d "cancel_url=http://localhost:5173/checkout" \
     -d "notify_url=http://localhost:8080/api/payment/notify" \
     -d "first_name=Test" \
     -d "last_name=User" \
     -d "email=test@test.com" \
     -d "phone=0771234567" \
     -d "address=Colombo" \
     -d "city=Colombo" \
     -d "country=Sri Lanka" \
     -d "order_id=$ORDER" \
     -d "items=Carrot" \
     -d "currency=$CURRENCY" \
     -d "amount=$AMOUNT" \
     -d "hash=$FINAL_HASH" \
     | grep -o "Unauthorized payment request" || echo "SUCCESS"

