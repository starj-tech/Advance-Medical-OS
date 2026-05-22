import React from 'react';

export default function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">Omni-Med Nexus OS</h1>
        <p className="text-gray-500">Super-Admin Control Tower</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Organizations</h3>
          <p className="text-3xl font-bold text-blue-600">124</p>
          <span className="text-green-500 text-sm">↑ 12 this month</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Global Server Load</h3>
          <p className="text-3xl font-bold text-orange-500">42%</p>
          <span className="text-gray-400 text-sm">Optimal Performance</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Security Status</h3>
          <p className="text-3xl font-bold text-green-600">100%</p>
          <span className="text-gray-400 text-sm">AES-256-GCM Active across all nodes</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Active Hospital Clients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hospital Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Database Node</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">ORG-JAK-001</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RSUD Pusat Jakarta</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">DKI Jakarta</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Online</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">asia-southeast1-a</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">ORG-SBY-042</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Surabaya Medical Center</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Jawa Timur</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Online</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">asia-southeast2-b</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">ORG-MED-015</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Klinik Utama Medan</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Sumatera Utara</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Maintenance</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">asia-southeast1-c</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
