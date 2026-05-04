import React, { useState } from 'react';

const UPIPayment = ({ amount, movieName, username = "Customer" }) => {
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      // Ensure the URL matches your Node.js server port (usually 5000)
      const response = await fetch('http://localhost:5000/api/payment/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          username: username,
          movieName: movieName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.qrCode) {
        setQrImage(data.qrCode);
      } else {
        throw new Error(data.error || "Failed to generate QR");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Error generating QR code. Is the backend server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {qrImage ? (
        <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-gray-200">
          <img 
            src={qrImage} 
            alt="UPI QR Code" 
            className="w-48 h-48 transition-all duration-500 ease-in-out" 
          />
          <p className="text-center text-xs text-gray-500 mt-3 font-medium">
            Scan to pay ₹{amount}
          </p>
        </div>
      ) : (
        <button
          onClick={handleGenerateQR}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3 border-t-2 border-white rounded-full" viewBox="0 0 24 24"></svg>
              Processing...
            </span>
          ) : (
            "Generate QR Code →"
          )}
        </button>
      )}

      {qrImage && (
        <button 
          onClick={() => setQrImage(null)}
          className="mt-4 text-gray-400 hover:text-red-500 text-sm transition-colors"
        >
          Reset Payment
        </button>
      )}
    </div>
  );
};

export default UPIPayment;