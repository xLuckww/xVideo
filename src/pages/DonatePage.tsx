const c = { bg: '#fff', border: '#E5E5EA', text: '#1D1D1F', text2: '#86868B', text3: '#AEAEB2' };

export function DonatePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>赞赏</h1>
        <p style={{ fontSize: '13px', color: c.text2, marginTop: '4px' }}>如果你喜欢本产品的话，可以对作者进行投喂鼓励一下！</p>
      </div>

      <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '32px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', width: '100%', maxWidth: '600px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '100%', background: '#F5F5F7', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <img src="/donate/alipay.png" alt="支付宝" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>
            <p style={{ fontSize: '14px', color: c.text2, marginTop: '12px', fontWeight: 500 }}>支付宝</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '100%', background: '#F5F5F7', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <img src="/donate/wechat.png" alt="微信支付" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>
            <p style={{ fontSize: '14px', color: c.text2, marginTop: '12px', fontWeight: 500 }}>微信支付</p>
          </div>
        </div>
      </div>
    </div>
  );
}