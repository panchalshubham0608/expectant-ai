function Dashboard(){

return (

<div className="space-y-6">

<h1 className="text-2xl font-semibold">
Good evening, Shubham 🌱
</h1>


<p className="text-gray-500">
Pregnancy Week 8
</p>


<div className="rounded-2xl bg-white p-5 shadow-sm">

<h2 className="font-medium">
Today's Overview
</h2>


<div className="mt-4 space-y-3">

<p>
🥗 Protein:
<span className="text-yellow-600">
 Needs attention
</span>
</p>

<p>
💧 Hydration:
<span className="text-green-600">
 Good
</span>
</p>


<p>
😊 Mood:
Better than yesterday
</p>


</div>

</div>



<div className="rounded-2xl bg-white p-5 shadow-sm">

<h2 className="font-medium">
Today's Actions
</h2>


<ul className="mt-3 space-y-2">

<li>☐ Buy bananas</li>

<li>☐ Prepare breakfast</li>

<li>☐ Keep snacks ready</li>

</ul>

</div>


</div>

);

}

export default Dashboard;
